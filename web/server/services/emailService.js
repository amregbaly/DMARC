import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, '../templates');

// Basic RFC 5322 email regex validator
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Sanitize header value to prevent email header injection (strip CR and LF).
 */
export function sanitizeHeader(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export const sanitizeEmailHeader = sanitizeHeader;

/**
 * Validate an email address format.
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  if (/[\r\n]/.test(email)) return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Create a Nodemailer transporter from given or stored SMTP settings.
 */
export function createTransporter(customSettings = null) {
  const settings = customSettings || db.getSmtpSettings({ includeDecrypted: true });

  if (!settings || !settings.host) {
    throw new Error('SMTP host is not configured. Please configure SMTP in the Admin Panel.');
  }

  const port = parseInt(settings.port, 10) || 587;
  const isSecure = settings.encryption === 'ssl' || port === 465;
  const requireTLS = settings.encryption === 'starttls';

  const config = {
    host: sanitizeHeader(settings.host),
    port: port,
    secure: isSecure,
    requireTLS: requireTLS,
    connectionTimeout: settings.connection_timeout || 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000
  };

  if (settings.username && settings.username.trim()) {
    config.auth = {
      user: sanitizeHeader(settings.username),
      pass: settings.password || ''
    };
  }

  return nodemailer.createTransport(config);
}

/**
 * Verify SMTP connection and credentials.
 */
export async function verifyConnection(customSettings = null) {
  const transporter = createTransporter(customSettings);
  return transporter.verify();
}

export const verifySmtpConnection = verifyConnection;

/**
 * Minimalist, robust Mustache-style template renderer.
 * Supports: {{key}}, {{#key}}...{{/key}} (boolean & array iterations), {{^key}}...{{/key}} (inversions).
 */
export function renderMustache(template, data = {}) {
  let output = template;

  // 1. Process array / truthy sections: {{#key}}...{{/key}}
  const sectionRegex = /\{\{#([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  output = output.replace(sectionRegex, (match, key, content) => {
    const val = data[key];
    if (!val) return '';
    if (Array.isArray(val)) {
      if (val.length === 0) return '';
      return val.map(item => {
        const itemData = (typeof item === 'object' && item !== null) ? { ...data, ...item } : { ...data, this: item };
        return renderMustache(content, itemData);
      }).join('');
    }
    return renderMustache(content, data);
  });

  // 2. Process inverted sections: {{^key}}...{{/key}}
  const invertedRegex = /\{\{\^([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  output = output.replace(invertedRegex, (match, key, content) => {
    const val = data[key];
    const isFalsey = !val || (Array.isArray(val) && val.length === 0);
    return isFalsey ? renderMustache(content, data) : '';
  });

  // 3. Process simple variables: {{key}}
  const varRegex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  output = output.replace(varRegex, (match, key) => {
    if (data[key] !== undefined && data[key] !== null) {
      return String(data[key]);
    }
    return '';
  });

  return output;
}

/**
 * Convert HTML to clean plain text fallback.
 */
export function htmlToPlainText(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<td[^>]*>/gi, ' | ')
    .replace(/<th[^>]*>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&bull;/gi, '•')
    .replace(/&rarr;/gi, '->')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Render an HTML email with base layout wrapper.
 */
export function renderEmail(templateName, data = {}) {
  const baseLayoutPath = path.join(TEMPLATES_DIR, 'base_layout.html');
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);

  const baseLayout = fs.readFileSync(baseLayoutPath, 'utf8');
  let content = '';

  if (fs.existsSync(templatePath)) {
    const rawTemplate = fs.readFileSync(templatePath, 'utf8');
    content = renderMustache(rawTemplate, data);
  } else {
    content = `<p>${data.message || ''}</p>`;
  }

  const enrichedData = {
    title: sanitizeHeader(data.title || data.subject || 'DMARC Sentinel Notification'),
    content: content,
    timestamp: new Date().toUTCString(),
    dashboardUrl: data.dashboardUrl || process.env.APP_URL || 'https://dmarc.voxera.net',
    unsubscribeUrl: data.unsubscribeUrl || '',
    ...data
  };

  const finalHtml = renderMustache(baseLayout, enrichedData);
  const plainText = htmlToPlainText(finalHtml);

  return { html: finalHtml, text: plainText };
}

/**
 * Generate HMAC-signed unsubscribe token.
 */
export function generateUnsubscribeToken({ userId, type, targetId }) {
  const secret = process.env.JWT_SECRET || 'dmarc-sentinel-fallback-token-secret-32b';
  return jwt.sign({ userId, type, targetId }, secret, { expiresIn: '180d' });
}

/**
 * Verify HMAC-signed unsubscribe token.
 */
export function verifyUnsubscribeToken(token) {
  try {
    const secret = process.env.JWT_SECRET || 'dmarc-sentinel-fallback-token-secret-32b';
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
}

/**
 * Send an email directly through configured SMTP.
 */
export async function sendMailDirect({
  to,
  subject,
  html,
  text,
  attachments = [],
  replyTo = null,
  headers = {},
  customSettings = null
}) {
  const settings = customSettings || db.getSmtpSettings({ includeDecrypted: true });
  if (!settings.is_configured && !customSettings) {
    throw new Error('Outgoing SMTP email service is not configured. Please configure it in Admin Settings.');
  }

  const transporter = createTransporter(settings);

  // Validate recipients
  const recipientsList = (Array.isArray(to) ? to : [to])
    .map(r => (typeof r === 'string' ? r.trim() : ''))
    .filter(Boolean);

  if (recipientsList.length === 0) {
    throw new Error('No recipient email address provided.');
  }

  for (const r of recipientsList) {
    if (!isValidEmail(r)) {
      throw new Error(`Invalid recipient email address format: "${r}"`);
    }
  }

  const fromAddress = sanitizeHeader(settings.from_address);
  const fromName = sanitizeHeader(settings.from_name || 'DMARC Sentinel');
  const safeSubject = sanitizeHeader(subject);
  const safeReplyTo = replyTo ? sanitizeHeader(replyTo) : (settings.reply_to ? sanitizeHeader(settings.reply_to) : undefined);

  // Format attachments for Nodemailer
  const formattedAttachments = (attachments || []).map(att => {
    if (typeof att === 'string') {
      return { path: att };
    }
    return {
      filename: sanitizeHeader(att.filename || 'attachment'),
      content: att.content,
      path: att.path,
      contentType: att.contentType
    };
  });

  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to: recipientsList.join(', '),
    subject: safeSubject,
    html: html,
    text: text || htmlToPlainText(html),
    attachments: formattedAttachments,
    replyTo: safeReplyTo,
    headers: {
      'X-Mailer': 'DMARC Sentinel Security Engine',
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
      ...headers
    }
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

export default {
  sanitizeHeader,
  isValidEmail,
  createTransporter,
  verifyConnection,
  renderMustache,
  htmlToPlainText,
  renderEmail,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  sendMailDirect
};
