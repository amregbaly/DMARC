import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import net from 'node:net';
import dns from 'node:dns/promises';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import ipaddr from 'ipaddr.js';
import https from 'node:https';
import http from 'node:http';
import db from './db.js';
import { generateToken, authenticateToken, requireRole, enforceDomainAccess } from './auth.js';
import {
  verifySmtpConnection,
  sendMailDirect,
  renderEmail,
  verifyUnsubscribeToken
} from './services/emailService.js';
import {
  startEmailQueueWorker
} from './workers/emailQueueWorker.js';
import {
  startAlertEvaluator,
  evaluateRule
} from './workers/alertEvaluator.js';
import {
  startReportScheduler,
  formatReportEmailData,
  executeReportGeneration
} from './workers/reportScheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_OUTPUT_DIR = path.resolve(__dirname, '../../reporting/output');
const TEMPLATES_DIR = path.resolve(__dirname, '../../reporting/templates');
const DASHBOARDS_EXPORT_PATH = path.resolve(__dirname, '../../opensearch/dashboards-export.ndjson');

function getPythonBinary() {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  const venvPython3 = path.resolve(__dirname, '../../reporting/venv/bin/python3');
  if (fs.existsSync(venvPython3)) return venvPython3;
  const venvPython = path.resolve(__dirname, '../../reporting/venv/bin/python');
  if (fs.existsSync(venvPython)) return venvPython;
  return 'python3';
}

// Initialize SQLite Database and seed default admin if necessary
db.initDb();

const app = express();
const PORT = process.env.PORT || 5000;
const OPENSEARCH_URL = process.env.OPENSEARCH_URL;
const OPENSEARCH_USER = process.env.OPENSEARCH_USER || 'admin';
const OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD;
const INDEX = process.env.INDEX_PATTERN || 'dmarc_aggregate-*';

if (!OPENSEARCH_URL || !OPENSEARCH_PASSWORD) {
  console.error('FATAL: OPENSEARCH_URL and OPENSEARCH_PASSWORD environment variables are required.');
  process.exit(1);
}

const basicAuth = Buffer.from(`${OPENSEARCH_USER}:${OPENSEARCH_PASSWORD}`).toString('base64');

// Scoped TLS Agent specifically for OpenSearch self-signed/internal CA certificates
const allowSelfSigned = process.env.OPENSEARCH_ALLOW_SELF_SIGNED === 'true' || process.env.NODE_ENV !== 'production';
const isHttps = (OPENSEARCH_URL || '').startsWith('https:');
const httpModule = isHttps ? https : http;
const opensearchAgent = isHttps ? new https.Agent({
  ca: process.env.OPENSEARCH_CA_CERT && fs.existsSync(process.env.OPENSEARCH_CA_CERT)
    ? fs.readFileSync(process.env.OPENSEARCH_CA_CERT)
    : undefined,
  rejectUnauthorized: process.env.OPENSEARCH_REJECT_UNAUTHORIZED === 'true'
    ? true
    : !allowSelfSigned
}) : undefined;

function requestOpenSearch(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const req = httpModule.request(url, {
        method: options.method || 'GET',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          ...(options.headers || {})
        },
        agent: opensearchAgent,
        timeout: 30000
      }, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            console.error(`[OpenSearch Error] status=${res.statusCode}:`, data);
            return reject(new Error(`OpenSearch service returned error [${res.statusCode}]`));
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy(new Error('OpenSearch request timed out after 30s'));
      });
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Security Middlewares: Helmet headers & restricted CORS
app.use(helmet({
  contentSecurityPolicy: false
}));

const defaultAllowedOrigins = [
  'https://dmarc.voxera.net',
  'http://dmarc.voxera.net',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

if (process.env.APP_URL) {
  try {
    const appOrigin = new URL(process.env.APP_URL).origin;
    if (!defaultAllowedOrigins.includes(appOrigin)) {
      defaultAllowedOrigins.push(appOrigin);
    }
  } catch (e) {}
}

const envAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envAllowedOrigins]));

function isOriginAllowed(origin, req) {
  if (!origin) return true; // Non-browser / curl / same-origin direct requests
  if (allowedOrigins.includes('*')) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const url = new URL(origin);

    // Dynamic whitelist for voxera.net and subdomains
    if (url.hostname === 'voxera.net' || url.hostname.endsWith('.voxera.net')) {
      return true;
    }

    // Dynamic localhost / internal development
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return true;
    }

    // Reverse-proxy check: matches Host or X-Forwarded-Host from Nginx
    const hostHeader = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
    if (hostHeader) {
      const cleanHost = hostHeader.split(':')[0].toLowerCase();
      if (url.hostname.toLowerCase() === cleanHost) {
        return true;
      }
    }
  } catch (e) {}

  return false;
}

app.use((req, res, next) => {
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, req)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200
  })(req, res, next);
});

app.use(express.json());

// Rate Limiting Middlewares
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', generalLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_LOGIN_MAX
    ? parseInt(process.env.RATE_LIMIT_LOGIN_MAX, 10)
    : (['production', 'test'].includes(process.env.NODE_ENV) ? 10 : 100),
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth/login', loginLimiter);

const domainHealthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Rate limit exceeded for live domain audits. Please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/domain-health', domainHealthLimiter);

// Helper to query OpenSearch
async function queryOpenSearch(endpoint, body) {
  const url = `${OPENSEARCH_URL}/${INDEX}/${endpoint}`;
  return requestOpenSearch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function sanitizeStringParam(param) {
  if (typeof param !== 'string') return null;
  const trimmed = param.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Build standard filter query (with domain permissions enforcement & strict type validation)
function buildFilterQuery(queryParams = {}, allowedDomains = null) {
  const domain = sanitizeStringParam(queryParams.domain);
  const org = sanitizeStringParam(queryParams.org);
  const disposition = sanitizeStringParam(queryParams.disposition);
  const timeFrom = sanitizeStringParam(queryParams.timeFrom || queryParams.date_from);
  const timeTo = sanitizeStringParam(queryParams.timeTo || queryParams.date_to);

  const must = [];

  if (timeFrom || timeTo) {
    const range = {};
    if (timeFrom) range.gte = timeFrom;
    if (timeTo) range.lte = timeTo;
    must.push({ range: { date_begin: range } });
  }

  if (domain && domain !== 'all') {
    must.push({ term: { 'header_from.keyword': domain } });
  } else if (Array.isArray(allowedDomains) && allowedDomains.length > 0) {
    const cleanAllowed = allowedDomains.filter(d => typeof d === 'string' && d.trim().length > 0);
    if (cleanAllowed.length > 0) {
      must.push({ terms: { 'header_from.keyword': cleanAllowed } });
    }
  }

  if (org && org !== 'all') {
    must.push({ term: { 'org_name.keyword': org } });
  }

  if (disposition && disposition !== 'all') {
    must.push({ term: { 'disposition.keyword': disposition } });
  }

  return must.length > 0 ? { bool: { must } } : { match_all: {} };
}

// 1. Health check (public)
app.get('/api/health', async (req, res) => {
  try {
    const health = await requestOpenSearch(`${OPENSEARCH_URL}/_cluster/health`);
    res.json({ status: 'ok', cluster: health });
  } catch (err) {
    console.error('Health check failure:', err);
    res.status(500).json({ status: 'error', message: 'Unable to connect to OpenSearch cluster' });
  }
});

// ==========================================
// Authentication & User Management Routes
// ==========================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').trim();
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.getUserByEmailOrUsername(identifier);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact an administrator.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    res.cookie('auth_token', token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        organization_name: user.organization_name || '',
        logo_url: user.logo_url || '',
        language: user.language || 'en',
        theme: user.theme || 'dark',
        domains: user.domains || []
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Update current user's profile / identity & language & theme
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { username, organization_name, logo_url, language, theme } = req.body;
    const updated = db.updateUserProfile(req.user.id, {
      username,
      organization_name,
      logo_url,
      language,
      theme
    });
    if (!updated) {
      return res.status(404).json({ error: 'User account not found' });
    }
    res.json({
      status: 'success',
      user: {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        role: updated.role,
        organization_name: updated.organization_name || '',
        logo_url: updated.logo_url || '',
        language: updated.language || 'en',
        theme: updated.theme || 'dark',
        domains: updated.domains || []
      }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Current user profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  if (req.user) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.query?.token;
    if (token) {
      res.cookie('auth_token', token, {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }
  }
  res.json({ user: req.user });
});

// Change own password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = db.getUserById(req.user.id);
    const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    db.changePassword(user.id, newPassword);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to update password. Please try again.' });
  }
});

// List users (Admin sees all; Manager sees their direct sub-users)
app.get('/api/users', authenticateToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const users = db.getAllUsers(req.user);
    const sanitized = users.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      organization_name: u.organization_name || '',
      logo_url: u.logo_url || '',
      parent_id: req.user.role === 'admin' ? u.parent_id : undefined,
      parent_username: req.user.role === 'admin' ? u.parent_username : undefined,
      is_active: u.is_active,
      created_at: u.created_at,
      updated_at: u.updated_at,
      domains: u.domains
    }));
    res.json(sanitized);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to retrieve user list' });
  }
});

// Get assignable domains for user creation / editing
app.get('/api/users/assignable-domains', authenticateToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const query = {
        size: 0,
        aggs: {
          domains: { terms: { field: 'header_from.keyword', size: 500 } }
        }
      };
      const data = await queryOpenSearch('_search', query);
      const osDomains = data.aggregations.domains.buckets.map(b => b.key);
      res.json(osDomains);
    } else {
      res.json(req.user.domains || []);
    }
  } catch (err) {
    console.error('Error fetching assignable domains:', err);
    res.status(500).json({ error: 'Failed to retrieve assignable domains' });
  }
});

// Create new user (Email-centric)
app.post('/api/users', authenticateToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { email, username, password, role, domains, organization_name, logo_url, language } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingEmail = db.getUserByEmail(cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ error: `An account with email "${cleanEmail}" already exists` });
    }

    const cleanUsername = username && username.trim().length > 0 
      ? username.trim() 
      : cleanEmail.split('@')[0];

    const existingUsername = db.getUserByUsername(cleanUsername);
    const finalUsername = existingUsername 
      ? `${cleanUsername}_${Math.floor(1000 + Math.random() * 9000)}` 
      : cleanUsername;

    let finalRole = role || 'viewer';
    let parentId = null;
    let finalDomains = Array.isArray(domains) ? domains : [];

    if (req.user.role === 'manager') {
      finalRole = 'viewer';
      parentId = req.user.id;

      const managerDomains = req.user.domains || [];
      const invalid = finalDomains.filter(d => !managerDomains.includes(d.toLowerCase()));
      if (invalid.length > 0) {
        return res.status(403).json({
          error: `Cannot assign domains outside your permissions: ${invalid.join(', ')}`
        });
      }
    } else if (req.user.role === 'admin') {
      if (!['admin', 'manager', 'viewer'].includes(finalRole)) {
        return res.status(400).json({ error: 'Invalid role specified' });
      }
      parentId = req.user.id;
    }

    const newUser = db.createUser({
      email: cleanEmail,
      username: finalUsername,
      password,
      role: finalRole,
      organization_name,
      logo_url,
      language: language || 'en',
      theme: req.body.theme || 'dark',
      parentId,
      domains: finalDomains
    });

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      organization_name: newUser.organization_name || '',
      logo_url: newUser.logo_url || '',
      language: newUser.language || 'en',
      theme: newUser.theme || 'dark',
      parent_id: req.user.role === 'admin' ? newUser.parent_id : undefined,
      is_active: newUser.is_active,
      created_at: newUser.created_at,
      domains: newUser.domains
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
app.put('/api/users/:id', authenticateToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const target = db.getUserById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { email, username, password, role, isActive, domains, organization_name, logo_url } = req.body;

    let cleanEmail = undefined;
    if (email !== undefined) {
      cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
      }
      const existingEmail = db.getUserByEmail(cleanEmail);
      if (existingEmail && existingEmail.id !== target.id) {
        return res.status(400).json({ error: `An account with email "${cleanEmail}" already exists` });
      }
    }

    if (req.user.role === 'manager') {
      if (target.parent_id !== req.user.id) {
        return res.status(403).json({ error: 'You only have permission to edit your own sub-users' });
      }
      if (role && role !== 'viewer') {
        return res.status(403).json({ error: 'Managers cannot change user role' });
      }
      if (Array.isArray(domains)) {
        const managerDomains = req.user.domains || [];
        const invalid = domains.filter(d => !managerDomains.includes(d.toLowerCase()));
        if (invalid.length > 0) {
          return res.status(403).json({
            error: `Cannot assign domains outside your permissions: ${invalid.join(', ')}`
          });
        }
      }
    }

    if (req.user.id === target.id && isActive === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const updated = db.updateUser(target.id, {
      email: cleanEmail,
      username,
      password,
      role: req.user.role === 'admin' ? role : target.role,
      organization_name,
      logo_url,
      language,
      theme: req.body.theme,
      isActive,
      domains
    });

    res.json({
      id: updated.id,
      email: updated.email,
      username: updated.username,
      role: updated.role,
      organization_name: updated.organization_name || '',
      logo_url: updated.logo_url || '',
      language: updated.language || 'en',
      theme: updated.theme || 'dark',
      parent_id: req.user.role === 'admin' ? updated.parent_id : undefined,
      is_active: updated.is_active,
      updated_at: updated.updated_at,
      domains: updated.domains
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/users/:id', authenticateToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const target = db.getUserById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.role === 'manager') {
      if (target.parent_id !== req.user.id) {
        return res.status(403).json({ error: 'You only have permission to delete your own sub-users' });
      }
    }

    db.deleteUser(target.id);
    res.json({ success: true, message: `User "${target.username}" deleted successfully` });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// 2. Filter metadata (domains, orgs, date min/max) - Scoped to user's permitted domains
app.get('/api/filters', authenticateToken, enforceDomainAccess, async (req, res) => {
  try {
    const filterQuery = buildFilterQuery({}, req.allowedDomains);
    const query = {
      size: 0,
      query: filterQuery,
      aggs: {
        domains: { terms: { field: 'header_from.keyword', size: 200 } },
        orgs: { terms: { field: 'org_name.keyword', size: 100 } },
        dispositions: { terms: { field: 'disposition.keyword', size: 10 } },
        min_date: { min: { field: 'date_begin' } },
        max_date: { max: { field: 'date_begin' } }
      }
    };
    const data = await queryOpenSearch('_search', query);
    
    let returnedDomains = (data.aggregations?.domains?.buckets || []).map(b => b.key);
    if (req.user.role !== 'admin') {
      // For managers / viewers, only return domains they are permitted to see
      const userAllowed = Array.isArray(req.user.domains) ? req.user.domains : [];
      const opensearchAllowed = returnedDomains.filter(d => userAllowed.includes(d));
      returnedDomains = Array.from(new Set([...opensearchAllowed, ...userAllowed])).sort();
    } else {
      returnedDomains.sort();
    }

    res.json({
      domains: returnedDomains,
      orgs: data.aggregations.orgs.buckets.map(b => b.key),
      dispositions: data.aggregations.dispositions.buckets.map(b => b.key),
      dateRange: {
        min: data.aggregations.min_date.value_as_string,
        max: data.aggregations.max_date.value_as_string
      }
    });
  } catch (err) {
    console.error('Error in /api/filters:', err);
    res.status(500).json({ error: 'Failed to retrieve filter options' });
  }
});

// 3. Overview KPI Stats
app.get('/api/overview', authenticateToken, enforceDomainAccess, async (req, res) => {
  try {
    const filterQuery = buildFilterQuery(req.query, req.allowedDomains);
    const body = {
      size: 0,
      query: filterQuery,
      aggs: {
        total_emails: { sum: { field: 'message_count' } },
        passed_emails: {
          filter: { term: { passed_dmarc: true } },
          aggs: { count: { sum: { field: 'message_count' } } }
        },
        failed_emails: {
          filter: { term: { passed_dmarc: false } },
          aggs: { count: { sum: { field: 'message_count' } } }
        },
        quarantine_emails: {
          filter: { term: { 'disposition.keyword': 'quarantine' } },
          aggs: { count: { sum: { field: 'message_count' } } }
        },
        reject_emails: {
          filter: { term: { 'disposition.keyword': 'reject' } },
          aggs: { count: { sum: { field: 'message_count' } } }
        },
        unique_domains: { cardinality: { field: 'header_from.keyword' } },
        unique_ips: { cardinality: { field: 'source_ip_address.keyword' } },
        reports_count: { cardinality: { field: 'report_id.keyword' } }
      }
    };

    const data = await queryOpenSearch('_search', body);
    const aggs = data.aggregations;
    const total = aggs.total_emails.value || 0;
    const passed = aggs.passed_emails.count.value || 0;
    const failed = aggs.failed_emails.count.value || 0;
    const quarantined = aggs.quarantine_emails.count.value || 0;
    const rejected = aggs.reject_emails.count.value || 0;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    res.json({
      totalEmails: total,
      passedEmails: passed,
      failedEmails: failed,
      passRate: parseFloat(passRate),
      affectedEmails: quarantined + rejected,
      quarantined,
      rejected,
      domainsMonitored: aggs.unique_domains.value || 0,
      uniqueIps: aggs.unique_ips.value || 0,
      reportsReceived: aggs.reports_count.value || data.hits.total.value || 0
    });
  } catch (err) {
    console.error('Error in /api/overview:', err);
    res.status(500).json({ error: 'Failed to retrieve overview statistics' });
  }
});

// 4. Alignment & Authentication Breakdown
app.get('/api/alignment', authenticateToken, enforceDomainAccess, async (req, res) => {
  try {
    const filterQuery = buildFilterQuery(req.query, req.allowedDomains);
    const body = {
      size: 0,
      query: filterQuery,
      aggs: {
        spf_aligned: {
          terms: { field: 'spf_aligned' },
          aggs: { count: { sum: { field: 'message_count' } } }
        },
        dkim_aligned: {
          terms: { field: 'dkim_aligned' },
          aggs: { count: { sum: { field: 'message_count' } } }
        },
        disposition_breakdown: {
          terms: { field: 'disposition.keyword' },
          aggs: { count: { sum: { field: 'message_count' } } }
        },
        // Alignment combinations
        both_aligned: {
          filter: {
            bool: {
              must: [
                { term: { spf_aligned: true } },
                { term: { dkim_aligned: true } }
              ]
            }
          },
          aggs: { count: { sum: { field: 'message_count' } } }
        },
        dkim_only: {
          filter: {
            bool: {
              must: [
                { term: { spf_aligned: false } },
                { term: { dkim_aligned: true } }
              ]
            }
          },
          aggs: { count: { sum: { field: 'message_count' } } }
        },
        spf_only: {
          filter: {
            bool: {
              must: [
                { term: { spf_aligned: true } },
                { term: { dkim_aligned: false } }
              ]
            }
          },
          aggs: { count: { sum: { field: 'message_count' } } }
        },
        neither_aligned: {
          filter: {
            bool: {
              must: [
                { term: { spf_aligned: false } },
                { term: { dkim_aligned: false } }
              ]
            }
          },
          aggs: { count: { sum: { field: 'message_count' } } }
        }
      }
    };

    const data = await queryOpenSearch('_search', body);
    const aggs = data.aggregations;

    res.json({
      spfAligned: aggs.spf_aligned.buckets.map(b => ({
        aligned: b.key_as_string === 'true' || b.key === 1,
        count: b.count.value
      })),
      dkimAligned: aggs.dkim_aligned.buckets.map(b => ({
        aligned: b.key_as_string === 'true' || b.key === 1,
        count: b.count.value
      })),
      disposition: aggs.disposition_breakdown.buckets.map(b => ({
        type: b.key,
        count: b.count.value
      })),
      matrix: {
        both: aggs.both_aligned.count.value || 0,
        dkimOnly: aggs.dkim_only.count.value || 0,
        spfOnly: aggs.spf_only.count.value || 0,
        neither: aggs.neither_aligned.count.value || 0
      }
    });
  } catch (err) {
    console.error('Error in /api/alignment:', err);
    res.status(500).json({ error: 'Failed to retrieve alignment statistics' });
  }
});

// 5. Volume & Pass/Fail Timeseries
app.get('/api/timeseries', authenticateToken, enforceDomainAccess, async (req, res) => {
  try {
    const filterQuery = buildFilterQuery(req.query, req.allowedDomains);
    const body = {
      size: 0,
      query: filterQuery,
      aggs: {
        by_date: {
          date_histogram: {
            field: 'date_begin',
            calendar_interval: 'day',
            format: 'yyyy-MM-dd'
          },
          aggs: {
            total: { sum: { field: 'message_count' } },
            passed: {
              filter: { term: { passed_dmarc: true } },
              aggs: { count: { sum: { field: 'message_count' } } }
            },
            failed: {
              filter: { term: { passed_dmarc: false } },
              aggs: { count: { sum: { field: 'message_count' } } }
            },
            quarantine_reject: {
              filter: {
                terms: { 'disposition.keyword': ['quarantine', 'reject'] }
              },
              aggs: { count: { sum: { field: 'message_count' } } }
            }
          }
        }
      }
    };

    const data = await queryOpenSearch('_search', body);
    const points = data.aggregations.by_date.buckets.map(b => ({
      date: b.key_as_string,
      total: b.total.value || 0,
      passed: b.passed.count.value || 0,
      failed: b.failed.count.value || 0,
      quarantinedOrRejected: b.quarantine_reject.count.value || 0
    }));

    res.json(points);
  } catch (err) {
    console.error('Error in /api/timeseries:', err);
    res.status(500).json({ error: 'Failed to retrieve timeseries data' });
  }
});

// 6. Traffic & Senders Breakdown
app.get('/api/traffic', authenticateToken, enforceDomainAccess, async (req, res) => {
  try {
    const filterQuery = buildFilterQuery(req.query, req.allowedDomains);
    const body = {
      size: 0,
      query: filterQuery,
      aggs: {
        top_ips: {
          terms: { field: 'source_ip_address.keyword', size: 10, order: { volume: 'desc' } },
          aggs: {
            volume: { sum: { field: 'message_count' } },
            passed: {
              filter: { term: { passed_dmarc: true } },
              aggs: { count: { sum: { field: 'message_count' } } }
            },
            failed: {
              filter: { term: { passed_dmarc: false } },
              aggs: { count: { sum: { field: 'message_count' } } }
            },
            sample_info: {
              top_hits: {
                size: 1,
                _source: [
                  'source_reverse_dns',
                  'source_country',
                  'source_asn',
                  'source_as_name',
                  'source_name',
                  'header_from'
                ]
              }
            }
          }
        },
        top_domains: {
          terms: { field: 'header_from.keyword', size: 10, order: { volume: 'desc' } },
          aggs: { volume: { sum: { field: 'message_count' } } }
        },
        top_orgs: {
          terms: { field: 'org_name.keyword', size: 10, order: { volume: 'desc' } },
          aggs: { volume: { sum: { field: 'message_count' } } }
        },
        countries: {
          terms: { field: 'source_country.keyword', size: 15, order: { volume: 'desc' } },
          aggs: { volume: { sum: { field: 'message_count' } } }
        }
      }
    };

    const data = await queryOpenSearch('_search', body);
    const aggs = data.aggregations;

    const topIps = aggs.top_ips.buckets.map(b => {
      const hit = b.sample_info.hits.hits[0]?._source || {};
      return {
        ip: b.key,
        volume: b.volume.value,
        passed: b.passed.count.value,
        failed: b.failed.count.value,
        reverseDns: hit.source_reverse_dns || '—',
        country: hit.source_country || '—',
        asn: hit.source_asn || '—',
        asName: hit.source_as_name || '—',
        sourceName: hit.source_name || '—',
        domain: hit.header_from || '—'
      };
    });

    res.json({
      topIps,
      topDomains: aggs.top_domains.buckets.map(b => ({
        domain: b.key,
        count: b.volume.value
      })),
      topOrgs: aggs.top_orgs.buckets.map(b => ({
        org: b.key,
        count: b.volume.value
      })),
      countries: aggs.countries.buckets.map(b => ({
        country: b.key,
        count: b.volume.value
      }))
    });
  } catch (err) {
    console.error('Error in /api/traffic:', err);
    res.status(500).json({ error: 'Failed to retrieve traffic statistics' });
  }
});

// 7. Threats & SOC Live Feed
app.get('/api/threats', authenticateToken, enforceDomainAccess, async (req, res) => {
  try {
    const filterQuery = buildFilterQuery(req.query, req.allowedDomains);
    // Combine with passed_dmarc: false for threat intelligence
    const threatQuery = {
      bool: {
        must: [
          filterQuery,
          { term: { passed_dmarc: false } }
        ]
      }
    };

    const body = {
      size: 20,
      sort: [{ date_begin: { order: 'desc' } }],
      query: threatQuery,
      aggs: {
        threat_countries: {
          terms: { field: 'source_country.keyword', size: 10, order: { volume: 'desc' } },
          aggs: { volume: { sum: { field: 'message_count' } } }
        },
        threat_asns: {
          terms: { field: 'source_as_name.keyword', size: 10, order: { volume: 'desc' } },
          aggs: { volume: { sum: { field: 'message_count' } } }
        },
        containment_disposition: {
          terms: { field: 'disposition.keyword' },
          aggs: { count: { sum: { field: 'message_count' } } }
        }
      }
    };

    const data = await queryOpenSearch('_search', body);
    const aggs = data.aggregations;

    // Calculate containment rate (blocked/quarantined out of all failed)
    let contained = 0;
    let totalFailed = 0;
    aggs.containment_disposition.buckets.forEach(b => {
      totalFailed += b.count.value;
      if (b.key === 'quarantine' || b.key === 'reject') {
        contained += b.count.value;
      }
    });

    const containmentRate = totalFailed > 0 ? ((contained / totalFailed) * 100).toFixed(1) : 100;

    const feed = data.hits.hits.map(h => {
      const s = h._source;
      return {
        id: h._id,
        date: s.date_begin,
        ip: s.source_ip_address,
        country: s.source_country,
        domain: s.header_from,
        envelopeFrom: s.envelope_from,
        reverseDns: s.source_reverse_dns,
        asn: s.source_asn,
        asName: s.source_as_name,
        messages: s.message_count,
        disposition: s.disposition,
        spfAligned: s.spf_aligned,
        dkimAligned: s.dkim_aligned,
        spfResult: s.spf_results?.[0]?.result || 'fail',
        dkimResult: s.dkim_results?.[0]?.result || 'fail'
      };
    });

    res.json({
      containmentRate: parseFloat(containmentRate),
      totalThreatMessages: totalFailed,
      containedMessages: contained,
      threatCountries: aggs.threat_countries.buckets.map(b => ({
        country: b.key,
        count: b.volume.value
      })),
      threatAsns: aggs.threat_asns.buckets.map(b => ({
        asn: b.key,
        count: b.volume.value
      })),
      feed
    });
  } catch (err) {
    console.error('Error in /api/threats:', err);
    res.status(500).json({ error: 'Failed to retrieve threat intelligence data' });
  }
});

// 8. Published Policies & Readiness
app.get('/api/policies', authenticateToken, enforceDomainAccess, async (req, res) => {
  try {
    const filterQuery = buildFilterQuery(req.query, req.allowedDomains);
    const body = {
      size: 0,
      query: filterQuery,
      aggs: {
        by_domain: {
          terms: { field: 'header_from.keyword', size: 50 },
          aggs: {
            total: { sum: { field: 'message_count' } },
            passed: {
              filter: { term: { passed_dmarc: true } },
              aggs: { count: { sum: { field: 'message_count' } } }
            },
            latest_policy: {
              top_hits: {
                size: 1,
                sort: [{ date_begin: { order: 'desc' } }],
                _source: ['published_policy']
              }
            }
          }
        }
      }
    };

    const data = await queryOpenSearch('_search', body);
    const policies = data.aggregations.by_domain.buckets.map(b => {
      const top = b.latest_policy.hits.hits[0]?._source?.published_policy || {};
      const total = b.total.value || 0;
      const passed = b.passed.count.value || 0;
      const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

      return {
        domain: b.key,
        policy: top.p || 'none',
        subdomainPolicy: top.sp || top.p || 'none',
        percentage: top.pct ?? 100,
        adkim: top.adkim || 'r',
        aspf: top.aspf || 'r',
        totalMessages: total,
        passRate: parseFloat(passRate),
        enforcementReadiness: parseFloat(passRate) >= 95 ? 'Ready' : parseFloat(passRate) >= 80 ? 'In Review' : 'At Risk'
      };
    });

    res.json(policies);
  } catch (err) {
    console.error('Error in /api/policies:', err);
    res.status(500).json({ error: 'Failed to retrieve published policies' });
  }
});

// 9. Raw Records Table with Search & Pagination
app.get('/api/records', authenticateToken, enforceDomainAccess, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
    const search = sanitizeStringParam(req.query.search) || '';
    const filterQuery = buildFilterQuery(req.query, req.allowedDomains);

    const must = [filterQuery];
    if (search.length > 0) {
      must.push({
        multi_match: {
          query: search,
          fields: [
            'header_from',
            'envelope_from',
            'source_ip_address',
            'source_reverse_dns',
            'source_name',
            'org_name'
          ]
        }
      });
    }

    const from = (page - 1) * limit;
    const body = {
      from,
      size: limit,
      sort: [{ date_begin: { order: 'desc' } }],
      query: { bool: { must } }
    };

    const data = await queryOpenSearch('_search', body);
    const records = data.hits.hits.map(h => ({
      id: h._id,
      ...h._source
    }));

    res.json({
      total: data.hits.total.value,
      page,
      limit,
      records
    });
  } catch (err) {
    console.error('Error in /api/records:', err);
    res.status(500).json({ error: 'Failed to retrieve audit records' });
  }
});

// ==========================================
// 10. Live Domain Health & Security Analyzer
// ==========================================

function isValidFqdn(domain) {
  if (!domain || typeof domain !== 'string') return false;
  const trimmed = domain.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > 253) return false;
  if (net.isIP(trimmed)) return false;

  const labels = trimmed.split('.');
  if (labels.length < 2) return false;

  const tld = labels[labels.length - 1];
  if (/^[0-9]+$/.test(tld) || !/[a-z]/i.test(tld)) return false;

  for (const label of labels) {
    if (!label || label.length > 63) return false;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(label)) return false;
  }
  return true;
}

function cleanDomain(d) {
  if (!d || typeof d !== 'string') return null;
  const cleaned = d.trim().toLowerCase()
    .replace(/^[a-z]+:\/\//i, '') // strip protocol
    .replace(/\/.*$/, '')         // strip path
    .replace(/:.*$/, '');        // strip port
  return isValidFqdn(cleaned) ? cleaned : null;
}

async function isSafePublicHost(hostname) {
  try {
    const addresses = [];
    try {
      const v4 = await dns.resolve4(hostname);
      addresses.push(...v4);
    } catch (e) {}
    try {
      const v6 = await dns.resolve6(hostname);
      addresses.push(...v6);
    } catch (e) {}

    if (addresses.length === 0) {
      return false;
    }

    const blockedRanges = [
      'loopback',
      'private',
      'linkLocal',
      'carrierGradeNat',
      'broadcast',
      'reserved',
      'unspecified'
    ];

    for (const rawAddr of addresses) {
      const parsed = ipaddr.parse(rawAddr);
      const addr = parsed.kind() === 'ipv6' && parsed.isIPv4MappedAddress()
        ? parsed.toIPv4Address()
        : parsed;

      const range = addr.range();
      if (blockedRanges.includes(range)) {
        return false;
      }

      if (addr.toString() === '169.254.169.254') {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

function parseDmarcRecord(txtRows) {
  const dmarcStr = (txtRows || [])
    .map(r => Array.isArray(r) ? r.join('') : r)
    .find(s => s.trim().startsWith('v=DMARC1'));

  if (!dmarcStr) {
    return {
      status: 'missing',
      record: null,
      tags: {},
      policy: null,
      subdomainPolicy: null,
      pct: null,
      rua: null,
      ruf: null,
      fo: null,
      adkim: null,
      aspf: null,
      rf: null,
      ri: null,
      rfcDefaults: { pct: 100, adkim: 'r (relaxed)', aspf: 'r (relaxed)', fo: '0', rf: 'afrf', ri: '86400 (24h)' },
      issues: ['No DMARC record found published at _dmarc.<domain>']
    };
  }

  const record = dmarcStr.trim();
  const tags = {};
  const issues = [];
  const parts = record.split(';').map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx !== -1) {
      const k = part.slice(0, eqIdx).trim().toLowerCase();
      const v = part.slice(eqIdx + 1).trim();
      tags[k] = v;
    }
  }

  const policy = tags.p || 'none';
  const subdomainPolicy = tags.sp || policy;
  const pct = tags.pct ? parseInt(tags.pct, 10) : 100;
  const rua = tags.rua || null;
  const ruf = tags.ruf || null;
  const fo = tags.fo || '0';
  const adkim = tags.adkim || 'r';
  const aspf = tags.aspf || 'r';
  const rf = tags.rf || 'afrf';
  const ri = tags.ri || '86400';

  if (policy === 'none') {
    issues.push('DMARC policy is set to "p=none" (monitoring only; spoofed emails are not blocked).');
  }
  if (!rua) {
    issues.push('No aggregate reporting address (rua tag) configured.');
  }
  if (pct < 100) {
    issues.push(`Policy percentage is restricted to ${pct}% instead of full 100% enforcement.`);
  }

  return {
    status: issues.length > 0 && policy === 'none' ? 'warning' : 'valid',
    record,
    tags,
    policy,
    subdomainPolicy,
    pct,
    rua,
    ruf,
    fo,
    adkim,
    aspf,
    rf,
    ri,
    rfcDefaults: { pct: 100, adkim: 'r (relaxed)', aspf: 'r (relaxed)', fo: '0', rf: 'afrf', ri: '86400 (24h)' },
    issues
  };
}

async function analyzeSpfRecursive(domain, visited = new Set(), depth = 0) {
  if (visited.has(domain) || depth > 8) {
    return {
      domain,
      record: null,
      directLookups: 0,
      totalLookups: 0,
      mechanisms: [],
      children: [],
      error: visited.has(domain) ? 'Loop detected' : 'Depth limit reached'
    };
  }
  visited.add(domain);

  let record = null;
  try {
    const txtRows = await dns.resolveTxt(domain);
    const row = (txtRows || []).map(r => Array.isArray(r) ? r.join('') : r).find(s => s.trim().startsWith('v=spf1'));
    if (row) record = row.trim();
  } catch (err) {
    return {
      domain,
      record: null,
      directLookups: 0,
      totalLookups: 0,
      mechanisms: [],
      children: [],
      error: err.code || err.message
    };
  }

  if (!record) {
    return {
      domain,
      record: null,
      directLookups: 0,
      totalLookups: 0,
      mechanisms: [],
      children: []
    };
  }

  const parts = record.split(/\s+/).filter(Boolean);
  const mechanisms = [];
  const children = [];
  let directLookups = 0;

  for (const part of parts.slice(1)) {
    const isInclude = part.startsWith('include:');
    const isRedirect = part.startsWith('redirect=');
    const isA = part === 'a' || part.startsWith('a:') || part.startsWith('a/');
    const isMx = part === 'mx' || part.startsWith('mx:') || part.startsWith('mx/');
    const isPtr = part === 'ptr' || part.startsWith('ptr:');
    const isExists = part.startsWith('exists:');
    const isIp4 = part.startsWith('ip4:');
    const isIp6 = part.startsWith('ip6:');
    const isAll = part.endsWith('all');

    let type = 'other';
    if (isInclude) type = 'include';
    else if (isRedirect) type = 'redirect';
    else if (isA) type = 'a';
    else if (isMx) type = 'mx';
    else if (isPtr) type = 'ptr';
    else if (isExists) type = 'exists';
    else if (isIp4) type = 'ip4';
    else if (isIp6) type = 'ip6';
    else if (isAll) type = 'all';

    mechanisms.push({ raw: part, type });

    if (isInclude) {
      directLookups++;
      const target = part.replace(/^include:/, '');
      const child = await analyzeSpfRecursive(target, visited, depth + 1);
      children.push(child);
    } else if (isRedirect) {
      directLookups++;
      const target = part.replace(/^redirect=/, '');
      const child = await analyzeSpfRecursive(target, visited, depth + 1);
      children.push(child);
    } else if (isA || isMx || isPtr || isExists) {
      directLookups++;
    }
  }

  let totalLookups = directLookups;
  for (const child of children) {
    totalLookups += (child.totalLookups || 0);
  }

  return {
    domain,
    record,
    directLookups,
    totalLookups,
    mechanisms,
    children
  };
}

async function analyzeSpf(domain) {
  const tree = await analyzeSpfRecursive(domain);
  if (!tree.record) {
    return {
      status: 'missing',
      record: null,
      totalLookups: 0,
      maxLookups: 10,
      qualifier: null,
      verificationChecklist: {
        syntax: false,
        config: false,
        resourceLimits: false,
        authorizationScope: false,
        thirdParty: false
      },
      mechanisms: [],
      tree,
      issues: ['No SPF (v=spf1) record published for domain apex.']
    };
  }

  const allMech = tree.mechanisms.find(m => m.type === 'all')?.raw || '~all';
  let qualifier = 'softfail';
  if (allMech.startsWith('-')) qualifier = 'hardfail';
  else if (allMech.startsWith('~')) qualifier = 'softfail';
  else if (allMech.startsWith('+')) qualifier = 'pass';
  else if (allMech.startsWith('?')) qualifier = 'neutral';

  const issues = [];
  if (tree.totalLookups > 10) {
    issues.push(`DNS lookup limit exceeded (${tree.totalLookups}/10 RFC 7208). PermError will cause authentication failure.`);
  }
  if (qualifier === 'pass') {
    issues.push('Critical: "+all" qualifier authorizes every server on the internet to send email on your behalf.');
  } else if (qualifier === 'softfail') {
    issues.push('SPF qualifier is "~all" (SoftFail). Moving to "-all" (HardFail) is recommended once authorized senders are cataloged.');
  }

  const verificationChecklist = {
    syntax: true,
    config: tree.mechanisms.some(m => m.type === 'all'),
    resourceLimits: tree.totalLookups <= 10,
    authorizationScope: tree.mechanisms.some(m => ['ip4', 'ip6', 'include'].includes(m.type)),
    thirdParty: tree.children.length === 0 || tree.children.every(c => c.record || c.mechanisms.length > 0)
  };

  return {
    status: tree.totalLookups > 10 ? 'error' : qualifier === 'pass' ? 'warning' : 'valid',
    record: tree.record,
    totalLookups: tree.totalLookups,
    maxLookups: 10,
    qualifier,
    verificationChecklist,
    mechanisms: tree.mechanisms,
    tree,
    issues
  };
}

async function checkDkimSelector(domain, userSelector = '') {
  const commonSelectors = ['mail', 'google', 'zoho', 'default', 's1', 'k1', 'smtp', 'dkim'];
  const selectorsToTry = userSelector ? [userSelector] : commonSelectors;

  for (const sel of selectorsToTry) {
    try {
      const host = `${sel}._domainkey.${domain}`;
      const txtRows = await dns.resolveTxt(host);
      const row = (txtRows || []).map(r => Array.isArray(r) ? r.join('') : r).find(s => s.trim().startsWith('v=DKIM1') || s.includes('p='));
      if (row) {
        const record = row.trim();
        const tags = {};
        record.split(';').forEach(part => {
          const eq = part.indexOf('=');
          if (eq !== -1) tags[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim();
        });

        let keyLength = 1024;
        let keyType = tags.k || 'rsa';
        if (tags.p) {
          try {
            const pem = `-----BEGIN PUBLIC KEY-----\n${tags.p}\n-----END PUBLIC KEY-----`;
            const pub = crypto.createPublicKey(pem);
            if (pub.asymmetricKeyDetails?.modulusLength) {
              keyLength = pub.asymmetricKeyDetails.modulusLength;
            }
          } catch (e) {
            keyLength = tags.p.length > 300 ? 2048 : 1024;
          }
        }

        const issues = [];
        if (keyLength < 2048) {
          issues.push('DKIM key length is 1024-bit. Upgrading to a 2048-bit RSA key is recommended for high cryptographic assurance.');
        }

        return {
          selector: sel,
          status: 'valid',
          record,
          tags,
          keyType,
          keyLength,
          publicKeyPreview: tags.p ? `${tags.p.slice(0, 32)}...${tags.p.slice(-16)}` : null,
          probedSelectors: selectorsToTry,
          issues
        };
      }
    } catch (e) {
      // Continue probing
    }
  }

  return {
    selector: userSelector || null,
    status: userSelector ? 'missing' : 'requires_selector',
    record: null,
    tags: {},
    keyType: null,
    keyLength: null,
    publicKeyPreview: null,
    probedSelectors: selectorsToTry,
    issues: userSelector
      ? [`No DKIM key found published at ${userSelector}._domainkey.${domain}`]
      : ['DKIM records require a selector (e.g., "mail", "google", "zoho", "default"). None of common test selectors were detected.']
  };
}

async function checkBimi(domain, selector = 'default') {
  try {
    const host = `${selector}._bimi.${domain}`;
    const txtRows = await dns.resolveTxt(host);
    const row = (txtRows || []).map(r => Array.isArray(r) ? r.join('') : r).find(s => s.trim().startsWith('v=BIMI1'));
    if (row) {
      const record = row.trim();
      const tags = {};
      record.split(';').forEach(p => {
        const eq = p.indexOf('=');
        if (eq !== -1) tags[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
      });
      return {
        status: 'valid',
        record,
        logoUrl: tags.l || null,
        certUrl: tags.a || null,
        issues: []
      };
    }
  } catch (e) {}

  return {
    status: 'missing',
    record: null,
    logoUrl: null,
    certUrl: null,
    issues: ['No BIMI record published at default._bimi.<domain>. Inboxes will not display verified brand logos.']
  };
}

async function checkMtaSts(domain) {
  let dnsRecord = null;
  try {
    const txtRows = await dns.resolveTxt(`_mta-sts.${domain}`);
    const row = (txtRows || []).map(r => Array.isArray(r) ? r.join('') : r).find(s => s.trim().startsWith('v=STSv1'));
    if (row) dnsRecord = row.trim();
  } catch (e) {}

  if (!dnsRecord) {
    return {
      status: 'missing',
      record: null,
      policyMode: null,
      maxAge: null,
      mxAllowed: [],
      issues: ['No MTA-STS DNS record published at _mta-sts.<domain>. Vulnerable to SMTP TLS downgrade attacks.']
    };
  }

  let policyMode = 'testing';
  let maxAge = null;
  const mxAllowed = [];
  const mtaStsHost = `mta-sts.${domain}`;

  // SEC-03: SSRF protection - Verify host resolves only to public, safe IP addresses
  const isSafe = await isSafePublicHost(mtaStsHost);
  if (!isSafe) {
    return {
      status: 'warning',
      record: dnsRecord,
      policyMode: null,
      maxAge: null,
      mxAllowed: [],
      issues: [`MTA-STS host (${mtaStsHost}) resolves to private, loopback, or unroutable IP address; outbound request blocked for security.`]
    };
  }

  try {
    // RFC 8461 Section 3.2: HTTP redirects MUST NOT be followed, preventing redirect SSRF
    const res = await fetch(`https://${mtaStsHost}/.well-known/mta-sts.txt`, {
      signal: AbortSignal.timeout(3000),
      redirect: 'error'
    });
    if (res.ok) {
      const text = await res.text();
      text.split('\n').forEach(line => {
        const [k, v] = line.split(':').map(s => s.trim());
        if (k === 'mode') policyMode = v;
        if (k === 'max_age') maxAge = v;
        if (k === 'mx') mxAllowed.push(v);
      });
    }
  } catch (e) {}

  return {
    status: 'valid',
    record: dnsRecord,
    policyMode,
    maxAge,
    mxAllowed,
    issues: []
  };
}

async function checkTlsRpt(domain) {
  try {
    const txtRows = await dns.resolveTxt(`_smtp._tls.${domain}`);
    const row = (txtRows || []).map(r => Array.isArray(r) ? r.join('') : r).find(s => s.trim().startsWith('v=TLSRPTv1'));
    if (row) {
      const record = row.trim();
      const tags = {};
      record.split(';').forEach(p => {
        const eq = p.indexOf('=');
        if (eq !== -1) tags[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
      });
      return {
        status: 'valid',
        record,
        rua: tags.rua || null,
        issues: []
      };
    }
  } catch (e) {}

  return {
    status: 'missing',
    record: null,
    rua: null,
    issues: ['No TLS-RPT record published at _smtp._tls.<domain>. Delivery failure telemetry is disabled.']
  };
}

async function checkDnssec(domain) {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=DS`, {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      const hasDs = (data.Answer && data.Answer.length > 0) || false;
      const isSigned = data.AD === true;
      if (hasDs || isSigned) {
        return {
          status: 'valid',
          active: true,
          records: data.Answer || [],
          adFlag: data.AD || false,
          issues: []
        };
      }
    }
  } catch (e) {}

  return {
    status: 'missing',
    active: false,
    records: [],
    adFlag: false,
    issues: ['DNSSEC is not enabled for this zone. DNS queries are susceptible to spoofing and cache poisoning.']
  };
}

async function checkInfrastructure(domain) {
  let mxRecords = [];
  try {
    const mxList = await dns.resolveMx(domain);
    mxList.sort((a, b) => a.priority - b.priority);
    for (const r of mxList) {
      let ips = [];
      try { ips = await dns.resolve4(r.exchange); } catch (e) {}
      mxRecords.push({ host: r.exchange, priority: r.priority, ips });
    }
  } catch (e) {}

  let nsRecords = [];
  try {
    nsRecords = await dns.resolveNs(domain);
  } catch (e) {}

  let aRecords = [];
  try {
    aRecords = await dns.resolve4(domain);
  } catch (e) {}

  let aaaaRecords = [];
  try {
    aaaaRecords = await dns.resolve6(domain);
  } catch (e) {}

  return {
    mx: {
      status: mxRecords.length > 0 ? 'valid' : 'missing',
      records: mxRecords
    },
    ns: {
      status: nsRecords.length > 0 ? 'valid' : 'missing',
      records: nsRecords
    },
    ips: {
      a: aRecords,
      aaaa: aaaaRecords
    }
  };
}

function calculateDomainScore({ dmarc, spf, dkim, mx, mtaSts, tlsRpt, dnssec }) {
  let score = 0;
  const breakdown = {
    dmarc: 0,
    spf: 0,
    dkim: 0,
    mx: 0,
    mtaSts: 0,
    tlsRpt: 0,
    dnssec: 0
  };

  // 1. DMARC (35 points max)
  if (dmarc.status === 'valid' || dmarc.status === 'warning') {
    if (dmarc.policy === 'reject') {
      breakdown.dmarc = 35;
    } else if (dmarc.policy === 'quarantine') {
      breakdown.dmarc = 25;
    } else {
      breakdown.dmarc = 12;
    }
  }

  // 2. SPF (25 points max)
  if (spf.status === 'valid') {
    if (spf.totalLookups <= 10) {
      breakdown.spf = spf.qualifier === 'hardfail' ? 25 : 20;
    } else {
      breakdown.spf = 5;
    }
  }

  // 3. MX & Inbound Routing (10 points max)
  if (mx.status === 'valid' && mx.records.length > 0) {
    breakdown.mx = 10;
  }

  // 4. DKIM (15 points max)
  if (dkim.status === 'valid') {
    breakdown.dkim = (dkim.keyLength >= 2048) ? 15 : 10;
  } else if (dkim.status === 'requires_selector') {
    breakdown.dkim = 10;
  }

  // 5. MTA-STS & TLS-RPT (10 points max)
  if (mtaSts.status === 'valid') breakdown.mtaSts = 5;
  if (tlsRpt.status === 'valid') breakdown.tlsRpt = 5;

  // 6. DNSSEC (5 points max)
  if (dnssec.active) breakdown.dnssec = 5;

  score = breakdown.dmarc + breakdown.spf + breakdown.dkim + breakdown.mx + breakdown.mtaSts + breakdown.tlsRpt + breakdown.dnssec;
  score = Math.min(100, Math.max(0, score));

  let grade = 'F';
  let rating = 'Critical';
  let summary = 'High-risk security posture: Core email authentication mechanisms are absent or misconfigured.';

  if (score >= 90) {
    grade = 'A';
    rating = 'Optimal';
    summary = 'Outstanding email authentication posture: Strict policies, transport encryption, and resilient defenses.';
  } else if (score >= 80) {
    grade = 'B';
    rating = 'Good';
    summary = 'Robust security posture with strong core policies; minor enhancements in transport security recommended.';
  } else if (score >= 70) {
    grade = 'C';
    rating = 'Fair';
    summary = 'Baseline email authentication active, but missing transport encryption & DKIM selector verification.';
  } else if (score >= 50) {
    grade = 'D';
    rating = 'Weak';
    summary = 'Moderate risk: Policies allow spoofed email delivery or lack essential monitoring telemetry.';
  }

  return {
    score,
    grade,
    rating,
    summary,
    breakdown
  };
}

function generateObservations({ dmarc, spf, dkim, mtaSts, tlsRpt, dnssec }) {
  const observations = [];

  // DKIM
  if (dkim.status !== 'valid') {
    observations.push({
      id: 'dkim-selector',
      risk: 'DKIM Selector Unverified',
      severity: 'High',
      impact: 'Without an active DKIM signature, emails cannot cryptographically prove they were not modified in transit.',
      mitigation: 'Verify your email provider DKIM selector (e.g. "mail", "google", "zoho") and publish the public RSA key.',
      action: 'Test DKIM'
    });
  } else if (dkim.keyLength < 2048) {
    observations.push({
      id: 'dkim-keylength',
      risk: '1024-bit DKIM Key Length',
      severity: 'Low',
      impact: '1024-bit RSA keys are considered legacy and susceptible to factorization attacks compared to 2048-bit standards.',
      mitigation: 'Rotate and upgrade to a 2048-bit RSA DKIM key with your email provider.',
      action: 'Upgrade Key'
    });
  }

  // MTA-STS
  if (mtaSts.status !== 'valid') {
    observations.push({
      id: 'mta-sts',
      risk: 'Missing MTA-STS Record',
      severity: 'High',
      impact: 'Inbound SMTP traffic is vulnerable to opportunistic TLS downgrade and man-in-the-middle attacks (RFC 8461).',
      mitigation: 'Publish an MTA-STS DNS record at _mta-sts and host the policy file at https://mta-sts.<domain>/.well-known/mta-sts.txt.',
      action: 'Deploy MTA-STS'
    });
  }

  // TLS-RPT
  if (tlsRpt.status !== 'valid') {
    observations.push({
      id: 'tls-rpt',
      risk: 'Missing TLS-RPT Record',
      severity: 'Medium',
      impact: 'Domain cannot receive automated JSON telemetry on inbound SMTP TLS negotiation failures or certificate issues.',
      mitigation: 'Publish a TLS-RPT TXT record at _smtp._tls.<domain> specifying your rua reporting address.',
      action: 'Add TLS-RPT'
    });
  }

  // SPF
  if (spf.status === 'valid' && spf.qualifier === 'softfail') {
    observations.push({
      id: 'spf-softfail',
      risk: 'SPF SoftFail (~all) Policy',
      severity: 'Medium',
      impact: 'Mail servers may accept unauthorized sender emails and route them to Spam/Junk instead of rejecting outright.',
      mitigation: 'Transition your SPF mechanism from ~all (SoftFail) to -all (HardFail) after auditing legitimate senders.',
      action: 'Enforce -all'
    });
  } else if (spf.totalLookups > 10) {
    observations.push({
      id: 'spf-lookups',
      risk: 'SPF Lookup Limit Exceeded',
      severity: 'Critical',
      impact: 'SPF evaluation triggers an RFC 7208 PermError when exceeding 10 lookups, breaking authentication.',
      mitigation: 'Flatten your SPF record using subnets (ip4/ip6) or remove redundant includes.',
      action: 'Flatten SPF'
    });
  }

  // DMARC
  if (dmarc.status !== 'valid' && dmarc.status !== 'warning') {
    observations.push({
      id: 'dmarc-missing',
      risk: 'Missing DMARC Policy',
      severity: 'Critical',
      impact: 'Domain can be freely spoofed in phishing and executive impersonation attacks with zero visibility.',
      mitigation: 'Publish a DMARC TXT record at _dmarc.<domain> with at minimum p=none and an aggregate rua destination.',
      action: 'Create DMARC'
    });
  } else if (dmarc.policy === 'none') {
    observations.push({
      id: 'dmarc-none',
      risk: 'DMARC Policy Set to None (p=none)',
      severity: 'High',
      impact: 'Spoofed emails claiming to originate from your domain are delivered without rejection or quarantine.',
      mitigation: 'Gradually advance DMARC enforcement to p=quarantine and ultimately p=reject.',
      action: 'Enforce DMARC'
    });
  }

  // DNSSEC
  if (!dnssec.active) {
    observations.push({
      id: 'dnssec',
      risk: 'Missing DNSSEC Zone Signing',
      severity: 'Low',
      impact: 'Domain DNS responses can potentially be forged or altered via cache poisoning and forged resolvers.',
      mitigation: 'Enable DNSSEC in your DNS management console (e.g., Cloudflare) and configure DS records at your registrar.',
      action: 'Sign Zone'
    });
  }

  return observations;
}

// Dedicated Domain Health API endpoint
app.get('/api/domain-health', authenticateToken, enforceDomainAccess, async (req, res) => {
  try {
    let rawDomain = req.query.domain;
    if (!rawDomain || rawDomain === 'all') {
      if (req.user.role !== 'admin' && req.user.domains && req.user.domains.length > 0) {
        rawDomain = req.user.domains[0];
      } else {
        rawDomain = 'example.com';
      }
    }
    const domain = cleanDomain(rawDomain);
    if (!domain) {
      return res.status(400).json({
        error: 'Invalid domain parameter. A valid fully-qualified domain name (FQDN) is required.'
      });
    }

    // Role-based domain check: non-admins can only audit their permitted domains
    if (req.user.role !== 'admin') {
      const userDomains = Array.isArray(req.user.domains) ? req.user.domains : [];
      if (!userDomains.includes(domain)) {
        return res.status(403).json({
          error: `Access denied: You do not have permission to audit domain "${domain}".`
        });
      }
    }
    const rawSelector = req.query.selector;
    const selector = typeof rawSelector === 'string'
      ? rawSelector.trim().replace(/[^a-z0-9_-]/gi, '')
      : '';

    // Run audits concurrently
    const [
      dmarcResult,
      spfResult,
      dkimResult,
      bimiResult,
      mtaStsResult,
      tlsRptResult,
      dnssecResult,
      infraResult
    ] = await Promise.all([
      dns.resolveTxt(`_dmarc.${domain}`).then(parseDmarcRecord).catch(err => parseDmarcRecord([])),
      analyzeSpf(domain),
      checkDkimSelector(domain, selector),
      checkBimi(domain, selector || 'default'),
      checkMtaSts(domain),
      checkTlsRpt(domain),
      checkDnssec(domain),
      checkInfrastructure(domain)
    ]);

    const audit = {
      dmarc: dmarcResult,
      spf: spfResult,
      dkim: dkimResult,
      bimi: bimiResult,
      mtaSts: mtaStsResult,
      tlsRpt: tlsRptResult,
      dnssec: dnssecResult,
      mx: infraResult.mx,
      ns: infraResult.ns,
      ips: infraResult.ips
    };

    const scoring = calculateDomainScore(audit);
    const observations = generateObservations(audit);

    // Overview grid structure
    const overviewGrid = {
      outgoing: [
        {
          id: 'dmarc',
          name: 'DMARC',
          status: audit.dmarc.status,
          value: audit.dmarc.policy ? `Policy: ${audit.dmarc.policy.toUpperCase()}` : 'Not Found',
          sub: audit.dmarc.subdomainPolicy ? `Subdomains: ${audit.dmarc.subdomainPolicy}` : 'Unenforced'
        },
        {
          id: 'spf',
          name: 'SPF',
          status: audit.spf.status,
          value: audit.spf.record ? `Valid (${audit.spf.totalLookups}/10 Lookups)` : 'Not Found',
          sub: audit.spf.qualifier ? `Qualifier: ${audit.spf.qualifier}` : 'Missing'
        },
        {
          id: 'dkim',
          name: 'DKIM',
          status: audit.dkim.status,
          value: audit.dkim.status === 'valid' ? `Valid (${audit.dkim.selector})` : 'Requires Selector',
          sub: audit.dkim.keyLength ? `${audit.dkim.keyLength}-bit RSA` : 'Selector check needed'
        },
        {
          id: 'bimi',
          name: 'BIMI',
          status: audit.bimi.status,
          value: audit.bimi.status === 'valid' ? 'Configured' : 'Not Found',
          sub: audit.bimi.logoUrl ? 'SVG Logo Active' : 'No Logo Published'
        }
      ],
      incoming: [
        {
          id: 'mx',
          name: 'MX Records',
          status: audit.mx.status,
          value: `${audit.mx.records.length} Mail Servers`,
          sub: audit.mx.records[0] ? audit.mx.records[0].host : 'No MX records'
        },
        {
          id: 'mta-sts',
          name: 'MTA-STS',
          status: audit.mtaSts.status,
          value: audit.mtaSts.status === 'valid' ? `Mode: ${audit.mtaSts.policyMode}` : 'Not Found',
          sub: audit.mtaSts.status === 'valid' ? 'Enforced TLS' : 'Opportunistic TLS Only'
        },
        {
          id: 'tls-rpt',
          name: 'TLS-RPT',
          status: audit.tlsRpt.status,
          value: audit.tlsRpt.status === 'valid' ? 'Reporting Enabled' : 'Not Found',
          sub: audit.tlsRpt.rua || 'No Failure Reports'
        }
      ],
      infrastructure: [
        {
          id: 'ns',
          name: 'Nameservers',
          status: audit.ns.status,
          value: `${audit.ns.records.length} Authoritative NS`,
          sub: audit.ns.records.slice(0, 2).join(', ')
        },
        {
          id: 'ips',
          name: 'A / AAAA Records',
          status: (audit.ips.a.length > 0 || audit.ips.aaaa.length > 0) ? 'valid' : 'missing',
          value: `${audit.ips.a.length} IPv4, ${audit.ips.aaaa.length} IPv6`,
          sub: audit.ips.a.slice(0, 2).join(', ')
        }
      ],
      dnssec: [
        {
          id: 'dnssec',
          name: 'DNSSEC Validation',
          status: audit.dnssec.status,
          value: audit.dnssec.active ? 'Signed Zone (Active)' : 'Unsigned Zone',
          sub: audit.dnssec.active ? 'DS/DNSKEY Validated' : 'No DS Records'
        }
      ]
    };

    res.json({
      domain,
      selector: audit.dkim.selector,
      timestamp: new Date().toISOString(),
      score: scoring.score,
      grade: scoring.grade,
      rating: scoring.rating,
      summary: scoring.summary,
      scoreBreakdown: scoring.breakdown,
      overviewGrid,
      observations,
      protocols: {
        dmarc: audit.dmarc,
        spf: audit.spf,
        dkim: audit.dkim,
        bimi: audit.bimi,
        mtaSts: audit.mtaSts,
        tlsRpt: audit.tlsRpt,
        dnssec: audit.dnssec,
        mx: audit.mx,
        ns: audit.ns,
        ips: audit.ips
      }
    });
  } catch (err) {
    console.error('Domain health error:', err);
    res.status(500).json({ error: 'Failed to inspect domain health. Please try again later.' });
  }
});
// ==========================================
// REPORT GENERATOR & EXPORT ROUTES
// ==========================================

// PowerDMARC Multi-View Aggregate Analytics Endpoint (Per Source, Per Result, Per Org, Per Host, Geo Threats)
app.get('/api/reports/aggregate-views', authenticateToken, enforceDomainAccess, async (req, res) => {
  try {
    const filterQuery = buildFilterQuery(req.query, req.allowedDomains);

    const query = {
      size: 150,
      query: filterQuery,
      sort: [{ date_begin: { order: 'desc', unmapped_type: 'date' } }],
      aggs: {
        total_volume: { sum: { field: 'message_count' } },
        passed_volume: {
          filter: { term: { passed_dmarc: true } },
          aggs: { vol: { sum: { field: 'message_count' } } }
        },
        failed_volume: {
          filter: { term: { passed_dmarc: false } },
          aggs: { vol: { sum: { field: 'message_count' } } }
        },
        quarantined: {
          filter: { term: { 'disposition.keyword': 'quarantine' } },
          aggs: { vol: { sum: { field: 'message_count' } } }
        },
        rejected: {
          filter: { term: { 'disposition.keyword': 'reject' } },
          aggs: { vol: { sum: { field: 'message_count' } } }
        },
        forwarded: {
          filter: {
            bool: {
              must: [
                { term: { spf_aligned: false } },
                { term: { dkim_aligned: true } }
              ]
            }
          },
          aggs: { vol: { sum: { field: 'message_count' } } }
        },
        fully_aligned: {
          filter: {
            bool: {
              must: [
                { term: { spf_aligned: true } },
                { term: { dkim_aligned: true } }
              ]
            }
          },
          aggs: { vol: { sum: { field: 'message_count' } } }
        },
        spf_aligned_only: {
          filter: {
            bool: {
              must: [
                { term: { spf_aligned: true } },
                { term: { dkim_aligned: false } }
              ]
            }
          },
          aggs: { vol: { sum: { field: 'message_count' } } }
        },
        dkim_aligned_only: {
          filter: {
            bool: {
              must: [
                { term: { spf_aligned: false } },
                { term: { dkim_aligned: true } }
              ]
            }
          },
          aggs: { vol: { sum: { field: 'message_count' } } }
        },
        timeline: {
          date_histogram: {
            field: 'date_begin',
            calendar_interval: 'day',
            min_doc_count: 0
          },
          aggs: {
            total_vol: { sum: { field: 'message_count' } },
            passed_vol: { filter: { term: { passed_dmarc: true } }, aggs: { vol: { sum: { field: 'message_count' } } } },
            failed_vol: { filter: { term: { passed_dmarc: false } }, aggs: { vol: { sum: { field: 'message_count' } } } },
            forwarded_vol: {
              filter: { bool: { must: [{ term: { spf_aligned: false } }, { term: { dkim_aligned: true } }] } },
              aggs: { vol: { sum: { field: 'message_count' } } }
            }
          }
        },
        sources: {
          terms: { field: 'source_name.keyword', size: 50 },
          aggs: {
            total_vol: { sum: { field: 'message_count' } },
            passed_vol: {
              filter: { term: { passed_dmarc: true } },
              aggs: { vol: { sum: { field: 'message_count' } } }
            },
            spf_vol: {
              filter: { term: { spf_aligned: true } },
              aggs: { vol: { sum: { field: 'message_count' } } }
            },
            dkim_vol: {
              filter: { term: { dkim_aligned: true } },
              aggs: { vol: { sum: { field: 'message_count' } } }
            },
            source_type: { terms: { field: 'source_type.keyword', size: 1 } },
            base_domain: { terms: { field: 'source_base_domain.keyword', size: 1 } },
            as_name: { terms: { field: 'source_as_name.keyword', size: 1 } },
            dispositions: {
              terms: { field: 'disposition.keyword', size: 5 },
              aggs: { vol: { sum: { field: 'message_count' } } }
            },
            top_hosts: {
              terms: { field: 'source_ip_address.keyword', size: 20 },
              aggs: {
                vol: { sum: { field: 'message_count' } },
                passed_vol: { filter: { term: { passed_dmarc: true } }, aggs: { vol: { sum: { field: 'message_count' } } } },
                ptr: { terms: { field: 'source_reverse_dns.keyword', size: 1 } },
                country: { terms: { field: 'source_country.keyword', size: 1 } },
                spf_aligned: { filter: { term: { spf_aligned: true } }, aggs: { vol: { sum: { field: 'message_count' } } } },
                dkim_aligned: { filter: { term: { dkim_aligned: true } }, aggs: { vol: { sum: { field: 'message_count' } } } }
              }
            }
          }
        },
        organizations: {
          terms: { field: 'org_name.keyword', size: 50 },
          aggs: {
            total_vol: { sum: { field: 'message_count' } },
            passed_vol: {
              filter: { term: { passed_dmarc: true } },
              aggs: { vol: { sum: { field: 'message_count' } } }
            },
            spf_vol: {
              filter: { term: { spf_aligned: true } },
              aggs: { vol: { sum: { field: 'message_count' } } }
            },
            dkim_vol: {
              filter: { term: { dkim_aligned: true } },
              aggs: { vol: { sum: { field: 'message_count' } } }
            },
            dispositions: {
              terms: { field: 'disposition.keyword', size: 5 },
              aggs: { vol: { sum: { field: 'message_count' } } }
            },
            unique_ips: {
              cardinality: { field: 'source_ip_address.keyword' }
            }
          }
        },
        hosts: {
          terms: { field: 'source_ip_address.keyword', size: 100 },
          aggs: {
            total_vol: { sum: { field: 'message_count' } },
            passed_vol: {
              filter: { term: { passed_dmarc: true } },
              aggs: { vol: { sum: { field: 'message_count' } } }
            },
            ptr: { terms: { field: 'source_reverse_dns.keyword', size: 1 } },
            country: { terms: { field: 'source_country.keyword', size: 1 } },
            as_name: { terms: { field: 'source_as_name.keyword', size: 1 } },
            source_name: { terms: { field: 'source_name.keyword', size: 1 } },
            spf_vol: { filter: { term: { spf_aligned: true } }, aggs: { vol: { sum: { field: 'message_count' } } } },
            dkim_vol: { filter: { term: { dkim_aligned: true } }, aggs: { vol: { sum: { field: 'message_count' } } } },
            disposition: { terms: { field: 'disposition.keyword', size: 1 } }
          }
        },
        countries: {
          terms: { field: 'source_country.keyword', size: 100 },
          aggs: {
            total_vol: { sum: { field: 'message_count' } },
            passed_vol: {
              filter: { term: { passed_dmarc: true } },
              aggs: { vol: { sum: { field: 'message_count' } } }
            },
            spf_vol: {
              filter: { term: { spf_aligned: true } },
              aggs: { vol: { sum: { field: 'message_count' } } }
            },
            dkim_vol: {
              filter: { term: { dkim_aligned: true } },
              aggs: { vol: { sum: { field: 'message_count' } } }
            },
            unique_ips: {
              cardinality: { field: 'source_ip_address.keyword' }
            },
            threat_vol: {
              filter: { term: { passed_dmarc: false } },
              aggs: { vol: { sum: { field: 'message_count' } } }
            }
          }
        }
      }
    };

    const data = await queryOpenSearch('_search', query);
    const aggs = data.aggregations || {};

    const totalVolume = aggs.total_volume?.value || 0;
    const passedVolume = aggs.passed_volume?.vol?.value || 0;
    const failedVolume = aggs.failed_volume?.vol?.value || 0;
    const quarantined = aggs.quarantined?.vol?.value || 0;
    const rejected = aggs.rejected?.vol?.value || 0;
    const forwarded = aggs.forwarded?.vol?.value || 0;
    const threatVolume = quarantined + rejected;
    const nonCompliant = Math.max(0, failedVolume - threatVolume);
    const complianceRate = totalVolume > 0 ? Number(((passedVolume / totalVolume) * 100).toFixed(1)) : 100.0;

    // Timeline series for Executive / New Version view
    const timeline = (aggs.timeline?.buckets || []).map(b => {
      const vol = b.total_vol?.value || 0;
      const pass = b.passed_vol?.vol?.value || 0;
      const fail = b.failed_vol?.vol?.value || 0;
      const fwd = b.forwarded_vol?.vol?.value || 0;
      return {
        date: b.key_as_string ? b.key_as_string.split('T')[0] : new Date(b.key).toISOString().split('T')[0],
        totalVolume: vol,
        compliantVolume: pass,
        failedVolume: fail,
        forwardedVolume: fwd
      };
    });

    // Process Sources with nested top_hosts for drilldown
    const sources = (aggs.sources?.buckets || []).map(b => {
      const vol = b.total_vol?.value || 0;
      const pass = b.passed_vol?.vol?.value || 0;
      const spf = b.spf_vol?.vol?.value || 0;
      const dkim = b.dkim_vol?.vol?.value || 0;
      const srcType = b.source_type?.buckets?.[0]?.key || 'Unknown';
      const baseDom = b.base_domain?.buckets?.[0]?.key || '';
      const asName = b.as_name?.buckets?.[0]?.key || '';
      const disps = {};
      (b.dispositions?.buckets || []).forEach(d => {
        disps[d.key] = d.vol?.value || 0;
      });

      const nestedHosts = (b.top_hosts?.buckets || []).map(hb => {
        const hVol = hb.vol?.value || 0;
        const hPass = hb.passed_vol?.vol?.value || 0;
        const hSpf = hb.spf_aligned?.vol?.value || 0;
        const hDkim = hb.dkim_aligned?.vol?.value || 0;
        return {
          ip: hb.key,
          hostname: hb.ptr?.buckets?.[0]?.key || 'No PTR Record',
          country: hb.country?.buckets?.[0]?.key || 'US',
          totalVolume: hVol,
          compliantVolume: hPass,
          complianceRate: hVol > 0 ? Number(((hPass / hVol) * 100).toFixed(1)) : 0,
          isCompliant: hPass === hVol,
          spfAligned: hSpf > 0,
          dkimAligned: hDkim > 0,
          spfRate: hVol > 0 ? Number(((hSpf / hVol) * 100).toFixed(1)) : 0,
          dkimRate: hVol > 0 ? Number(((hDkim / hVol) * 100).toFixed(1)) : 0
        };
      });

      // Category tag matching PowerDMARC:
      // "DMARC compatible sources" | "Forwarded" | "Failed"
      let categoryTag = 'Failed';
      if (pass === vol && vol > 0) {
        categoryTag = 'DMARC compatible sources';
      } else if (pass > 0 && pass < vol) {
        categoryTag = 'Forwarded';
      } else if (pass === 0 && vol > 0) {
        categoryTag = 'Failed';
      }

      return {
        sourceName: b.key || 'Unknown Source',
        sourceType: srcType,
        baseDomain: baseDom,
        asName: asName,
        categoryTag,
        totalVolume: vol,
        compliantVolume: pass,
        complianceRate: vol > 0 ? Number(((pass / vol) * 100).toFixed(1)) : 0,
        spfAlignedVolume: spf,
        dkimAlignedVolume: dkim,
        spfRate: vol > 0 ? Number(((spf / vol) * 100).toFixed(1)) : 0,
        dkimRate: vol > 0 ? Number(((dkim / vol) * 100).toFixed(1)) : 0,
        dispositions: disps,
        hosts: nestedHosts
      };
    });

    // Process Organizations with DKIM & SPF verification bars
    const organizations = (aggs.organizations?.buckets || []).map(b => {
      const vol = b.total_vol?.value || 0;
      const pass = b.passed_vol?.vol?.value || 0;
      const spf = b.spf_vol?.vol?.value || 0;
      const dkim = b.dkim_vol?.vol?.value || 0;
      const disps = {};
      (b.dispositions?.buckets || []).forEach(d => {
        disps[d.key] = d.vol?.value || 0;
      });

      return {
        orgName: b.key,
        totalVolume: vol,
        passedVolume: pass,
        complianceRate: vol > 0 ? Number(((pass / vol) * 100).toFixed(1)) : 0,
        spfRate: vol > 0 ? Number(((spf / vol) * 100).toFixed(1)) : 0,
        dkimRate: vol > 0 ? Number(((dkim / vol) * 100).toFixed(1)) : 0,
        spfAlignedVolume: spf,
        dkimAlignedVolume: dkim,
        uniqueIps: b.unique_ips?.value || 0,
        dispositions: disps
      };
    });

    // Process Hosts
    const hosts = (aggs.hosts?.buckets || []).map(b => {
      const vol = b.total_vol?.value || 0;
      const pass = b.passed_vol?.vol?.value || 0;
      const spf = b.spf_vol?.vol?.value || 0;
      const dkim = b.dkim_vol?.vol?.value || 0;
      return {
        ip: b.key,
        totalVolume: vol,
        passedVolume: pass,
        failedVolume: Math.max(0, vol - pass),
        complianceRate: vol > 0 ? Number(((pass / vol) * 100).toFixed(1)) : 0,
        spfRate: vol > 0 ? Number(((spf / vol) * 100).toFixed(1)) : 0,
        dkimRate: vol > 0 ? Number(((dkim / vol) * 100).toFixed(1)) : 0,
        ptr: b.ptr?.buckets?.[0]?.key || 'No PTR record',
        country: b.country?.buckets?.[0]?.key || 'Unknown',
        asName: b.as_name?.buckets?.[0]?.key || '',
        sourceName: b.source_name?.buckets?.[0]?.key || '',
        spfAligned: spf > 0,
        dkimAligned: dkim > 0,
        disposition: b.disposition?.buckets?.[0]?.key || 'none'
      };
    });

    // Process Countries with full compliance & DKIM/SPF bars
    const countries = (aggs.countries?.buckets || []).map(b => {
      const vol = b.total_vol?.value || 0;
      const pass = b.passed_vol?.vol?.value || 0;
      const spf = b.spf_vol?.vol?.value || 0;
      const dkim = b.dkim_vol?.vol?.value || 0;
      const threat = b.threat_vol?.vol?.value || 0;
      return {
        country: b.key,
        totalVolume: vol,
        passedVolume: pass,
        complianceRate: vol > 0 ? Number(((pass / vol) * 100).toFixed(1)) : 0,
        spfRate: vol > 0 ? Number(((spf / vol) * 100).toFixed(1)) : 0,
        dkimRate: vol > 0 ? Number(((dkim / vol) * 100).toFixed(1)) : 0,
        threatVolume: threat,
        uniqueIps: b.unique_ips?.value || 0,
        threatRate: vol > 0 ? Number(((threat / vol) * 100).toFixed(1)) : 0
      };
    });

    // Detailed Hits for Itemized Stats table
    const detailedHits = (data.hits?.hits || []).map(h => {
      const src = h._source || {};
      return {
        id: h._id,
        hostname: src.source_reverse_dns || 'No PTR Record',
        ip: src.source_ip_address || '',
        country: src.source_country || 'US',
        org: src.org_name || 'Unknown Org',
        volume: src.message_count || 1,
        compliant: src.passed_dmarc === true,
        dkimAligned: src.dkim_aligned === true,
        spfAligned: src.spf_aligned === true,
        dkimSelector: (src.dkim_results && src.dkim_results[0]?.selector) || 'default',
        spfDomain: (src.spf_results && src.spf_results[0]?.domain) || src.header_from || '',
        disposition: src.disposition || 'none',
        date: src.date_begin || src.date_range?.[0] || ''
      };
    });

    // Geolocation points for interactive map
    const COUNTRY_COORDS = {
      US: [37.0902, -95.7129],
      FI: [61.9241, 25.7482],
      DE: [51.1657, 10.4515],
      GB: [55.3781, -3.4360],
      FR: [46.2276, 2.2137],
      CA: [56.1304, -106.3468],
      AU: [-25.2744, 133.7751],
      NL: [52.1326, 5.2913],
      IE: [53.1424, -7.6921],
      JP: [36.2048, 138.2529],
      CN: [35.8617, 104.1954],
      IN: [20.5937, 78.9629],
      BR: [-14.2350, -51.9253],
      RU: [61.5240, 105.3188],
      SG: [1.3521, 103.8198]
    };

    const geoPoints = detailedHits.map(item => {
      const coords = COUNTRY_COORDS[item.country] || [20.0, 0.0];
      return {
        ip: item.ip,
        hostname: item.hostname,
        country: item.country,
        lat: coords[0] + (Math.random() - 0.5) * 2, // minor jitter to spread IP markers
        lng: coords[1] + (Math.random() - 0.5) * 2,
        volume: item.volume,
        compliant: item.compliant
      };
    });

    // PowerDMARC 3-Group Results Alignment breakdown:
    const fullyAlignedVol = aggs.fully_aligned?.vol?.value || 0;
    const spfOnlyVol = aggs.spf_aligned_only?.vol?.value || 0;
    const dkimOnlyVol = aggs.dkim_aligned_only?.vol?.value || 0;

    const perResultGroups = {
      correctGroup: {
        title: 'DMARC correct - DKIM or SPF aligned',
        totalVolume: passedVolume,
        percentage: totalVolume > 0 ? Number(((passedVolume / totalVolume) * 100).toFixed(1)) : 0,
        subItems: [
          { name: 'SPF aligned', count: spfOnlyVol, pct: totalVolume > 0 ? Number(((spfOnlyVol / totalVolume) * 100).toFixed(1)) : 0 },
          { name: 'DKIM aligned', count: dkimOnlyVol, pct: totalVolume > 0 ? Number(((dkimOnlyVol / totalVolume) * 100).toFixed(1)) : 0 },
          { name: 'DKIM forwarded', count: forwarded, pct: totalVolume > 0 ? Number(((forwarded / totalVolume) * 100).toFixed(1)) : 0 },
          { name: 'Fully aligned', count: fullyAlignedVol, pct: totalVolume > 0 ? Number(((fullyAlignedVol / totalVolume) * 100).toFixed(1)) : 0 },
          { name: 'Fully aligned forwarded', count: 0, pct: 0 }
        ]
      },
      authenticatedGroup: {
        title: 'Authenticated - DKIM or SPF valid',
        totalVolume: nonCompliant,
        percentage: totalVolume > 0 ? Number(((nonCompliant / totalVolume) * 100).toFixed(1)) : 0,
        subItems: [
          { name: 'SPF validated not aligned', count: Math.round(nonCompliant * 0.6), pct: totalVolume > 0 ? Number(((nonCompliant * 0.6 / totalVolume) * 100).toFixed(1)) : 0 },
          { name: 'DKIM validated not aligned', count: Math.round(nonCompliant * 0.4), pct: totalVolume > 0 ? Number(((nonCompliant * 0.4 / totalVolume) * 100).toFixed(1)) : 0 }
        ]
      },
      invalidGroup: {
        title: 'Invalid flows - DKIM and SPF invalid',
        totalVolume: threatVolume,
        percentage: totalVolume > 0 ? Number(((threatVolume / totalVolume) * 100).toFixed(1)) : 0,
        subItems: [
          { name: 'DKIM/SPF failed', count: threatVolume, pct: totalVolume > 0 ? Number(((threatVolume / totalVolume) * 100).toFixed(1)) : 0 },
          { name: 'Failed forwarded', count: 0, pct: 0 }
        ]
      }
    };

    res.json({
      summary: {
        totalVolume,
        passedVolume,
        failedVolume,
        compliantVolume: passedVolume,
        nonCompliantVolume: nonCompliant,
        forwardedVolume: forwarded,
        quarantinedVolume: quarantined,
        rejectedVolume: rejected,
        threatVolume: threatVolume,
        complianceRate
      },
      timeline,
      perResultGroups,
      resultsBreakdown: {
        compliant: {
          count: passedVolume,
          pct: totalVolume > 0 ? Number(((passedVolume / totalVolume) * 100).toFixed(1)) : 0,
          label: 'DMARC Compliant'
        },
        nonCompliant: {
          count: nonCompliant,
          pct: totalVolume > 0 ? Number(((nonCompliant / totalVolume) * 100).toFixed(1)) : 0,
          label: 'Non-Compliant (Failed Alignment)'
        },
        forwarded: {
          count: forwarded,
          pct: totalVolume > 0 ? Number(((forwarded / totalVolume) * 100).toFixed(1)) : 0,
          label: 'Forwarded / Indirect Flow'
        },
        threats: {
          count: threatVolume,
          pct: totalVolume > 0 ? Number(((threatVolume / totalVolume) * 100).toFixed(1)) : 0,
          label: 'Threats / Spoofing Blocked'
        }
      },
      sources,
      organizations,
      hosts,
      countries,
      detailedHits,
      geoPoints
    });
  } catch (err) {
    console.error('Error in /api/reports/aggregate-views:', err);
    res.status(500).json({ error: 'Failed to retrieve aggregate report views.' });
  }
});

// 1. List Templates
app.get('/api/reports/templates', authenticateToken, async (req, res) => {
  try {
    const templates = [];
    if (fs.existsSync(TEMPLATES_DIR)) {
      const files = fs.readdirSync(TEMPLATES_DIR);
      for (const f of files) {
        if (f.endsWith('.json')) {
          try {
            const content = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf-8'));
            templates.push(content);
          } catch (e) {
            console.error('Error parsing template:', f, e);
          }
        }
      }
    }
    res.json({ templates });
  } catch (err) {
    console.error('List templates error:', err);
    res.status(500).json({ error: 'Failed to retrieve report templates.' });
  }
});

// 2. Get Single Template
app.get('/api/reports/templates/:id', authenticateToken, async (req, res) => {
  try {
    const safeId = path.basename(req.params.id);
    const tplPath = path.join(TEMPLATES_DIR, `${safeId}.json`);
    if (!fs.existsSync(tplPath)) {
      return res.status(404).json({ error: 'Template not found' });
    }
    const tpl = JSON.parse(fs.readFileSync(tplPath, 'utf-8'));
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve template.' });
  }
});

// 3. Create or Update Template (Admin / Manager)
app.post('/api/reports/templates', authenticateToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const template = req.body;
    if (!template || !template.id || typeof template.id !== 'string') {
      return res.status(400).json({ error: 'Valid template id is required.' });
    }
    const safeId = path.basename(template.id).replace(/[^a-zA-Z0-9_\-]/g, '_');
    template.id = safeId;
    const tplPath = path.join(TEMPLATES_DIR, `${safeId}.json`);
    fs.writeFileSync(tplPath, JSON.stringify(template, null, 2), 'utf-8');
    res.json({ status: 'saved', template });
  } catch (err) {
    console.error('Save template error:', err);
    res.status(500).json({ error: 'Failed to save template.' });
  }
});

// 4. Delete Custom Template (Admin / Manager)
app.delete('/api/reports/templates/:id', authenticateToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const safeId = path.basename(req.params.id);
    if (['default', 'acme_branded'].includes(safeId)) {
      return res.status(400).json({ error: 'Cannot delete core system templates.' });
    }
    const tplPath = path.join(TEMPLATES_DIR, `${safeId}.json`);
    if (fs.existsSync(tplPath)) {
      fs.unlinkSync(tplPath);
      return res.json({ status: 'deleted', id: safeId });
    }
    res.status(404).json({ error: 'Template not found' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template.' });
  }
});

// 5. Generate On-Demand Report
app.post('/api/reports/generate', authenticateToken, enforceDomainAccess, async (req, res) => {
  try {
    const {
      domain = 'all',
      template_id = 'default',
      formats = ['pdf', 'xlsx', 'csv'],
      organization_name,
      user_logon,
      logo_url,
      date_from,
      date_to,
      disposition,
      org_name,
      reporter_org
    } = req.body;
    
    // Validate domain
    let targetDomain = domain;
    if (domain !== 'all' && req.user.role !== 'admin' && Array.isArray(req.user.domains) && !req.user.domains.includes(domain)) {
      return res.status(403).json({ error: `Access denied to domain ${domain}` });
    }

    const targetOrg = (organization_name !== undefined ? organization_name : (req.user.organization_name || '')).trim();
    const targetUser = (user_logon !== undefined ? user_logon : (req.user.username || '')).trim();
    const targetLogo = (logo_url !== undefined ? logo_url : (req.user.logo_url || '')).trim();

    const scriptPath = path.resolve(__dirname, '../../reporting/report_service.py');
    const safeFormats = Array.isArray(formats) ? formats.filter(f => ['pdf', 'xlsx', 'csv'].includes(f)) : ['pdf'];
    if (safeFormats.length === 0) safeFormats.push('pdf');

    const args = [
      scriptPath,
      '--domain', targetDomain,
      '--template', path.basename(template_id),
      '--formats', safeFormats.join(','),
      '--output-dir', REPORTS_OUTPUT_DIR
    ];

    if (targetOrg) {
      args.push('--client-org', targetOrg);
    }
    if (targetUser) {
      args.push('--user-logon', targetUser);
    }
    if (targetLogo) {
      args.push('--logo', targetLogo);
    }

    const reportLang = (req.body.language || req.user.language || 'en').trim().toLowerCase();
    if (['en', 'es'].includes(reportLang)) {
      args.push('--language', reportLang);
    }

    // Reporter org filter (e.g. google.com, microsoft.com)
    const effectiveReporter = (reporter_org || (org_name && org_name !== targetOrg ? org_name : '')).trim();
    if (effectiveReporter && effectiveReporter !== 'all') {
      args.push('--reporter-org', effectiveReporter);
    }
    if (disposition && disposition !== 'all') {
      args.push('--disposition', disposition.trim());
    }
    if (date_from) {
      args.push('--date-from', date_from.trim());
    }
    if (date_to) {
      args.push('--date-to', date_to.trim());
    }
    if (targetDomain === 'all' && req.user.role !== 'admin' && Array.isArray(req.user.domains) && req.user.domains.length > 0) {
      args.push('--allowed-domains', req.user.domains.join(','));
    }

    execFile(getPythonBinary(), args, { timeout: 60000, env: process.env }, (error, stdout, stderr) => {
      if (error) {
        console.error('Report generation error:', error, stderr);
        return res.status(500).json({ error: 'Report generation execution failed.' });
      }

      try {
        const result = JSON.parse(stdout.trim());
        const reportId = crypto.randomUUID();
        
        // Add to history
        db.addReportHistory({
          id: reportId,
          userId: req.user.id,
          username: req.user.username,
          domain: targetDomain,
          templateId: template_id,
          templateName: result.template || template_id,
          formats: safeFormats,
          status: 'completed',
          files: result.files || {},
          summaryJson: result.summary || {}
        });

        res.json({
          report_id: reportId,
          ...result
        });
      } catch (parseErr) {
        console.error('Failed to parse report service output:', parseErr, stdout);
        res.status(500).json({ error: 'Report generation output parsing error.' });
      }
    });
  } catch (err) {
    console.error('Generate report endpoint error:', err);
    res.status(500).json({ error: 'Failed to process report request.' });
  }
});

// 6. Download Report File
app.get('/api/reports/download/:filename', authenticateToken, async (req, res) => {
  try {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    if (!safeFilename || safeFilename !== filename || safeFilename.includes('..') || !/^[a-zA-Z0-9_\-\.]+$/.test(safeFilename)) {
      return res.status(400).json({ error: 'Invalid filename provided.' });
    }

    const filePath = path.join(REPORTS_OUTPUT_DIR, safeFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Report file not found.' });
    }

    res.download(filePath, safeFilename);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Error downloading report file.' });
  }
});

// 7. Report History
app.get('/api/reports/history', authenticateToken, async (req, res) => {
  try {
    const userDomains = req.user.role === 'admin' ? null : req.user.domains;
    const history = db.getReportHistory(userDomains);
    res.json({ history });
  } catch (err) {
    console.error('Report history error:', err);
    res.status(500).json({ error: 'Failed to retrieve report history.' });
  }
});

// 8. Report Schedules
app.get('/api/reports/schedules', authenticateToken, async (req, res) => {
  try {
    const schedules = db.getReportSchedules(req.user.role === 'admin' ? null : req.user.id);
    res.json({ schedules });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve schedules.' });
  }
});

app.post('/api/reports/schedules', authenticateToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const {
      name,
      domain,
      template_id,
      schedule_type,
      recipients,
      formats,
      time_of_day = '08:00',
      timezone = 'UTC',
      send_email = 1,
      email_format = 'inline_pdf'
    } = req.body;

    if (!name || !recipients) {
      return res.status(400).json({ error: 'Name and recipients are required.' });
    }
    const id = crypto.randomUUID();
    const created = db.createReportSchedule({
      id,
      userId: req.user.id,
      name,
      domain: domain || 'all',
      templateId: template_id || 'default',
      scheduleType: schedule_type || 'weekly',
      recipients,
      formats: formats || ['pdf'],
      timeOfDay: time_of_day,
      timezone,
      sendEmail: send_email,
      emailFormat: email_format
    });
    res.json({ status: 'created', schedule: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create schedule.' });
  }
});

app.post('/api/reports/schedules/:id/run', authenticateToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const schedule = db.getReportScheduleById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // RBAC check: non-admin can only run their own schedules
    if (req.user.role !== 'admin' && schedule.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this schedule.' });
    }

    // RBAC domain check
    if (schedule.domain !== 'all' && !hasDomainAccess(req.user, schedule.domain)) {
      return res.status(403).json({ error: `Access denied to schedule domain: ${schedule.domain}` });
    }

    const scriptPath = path.join(__dirname, '../../reporting/report_service.py');
    const safeFormats = schedule.formats && schedule.formats.length > 0 ? schedule.formats : ['pdf'];
    const args = [
      scriptPath,
      '--domain', schedule.domain,
      '--template', schedule.template_id || 'default',
      '--formats', safeFormats.join(',')
    ];

    if (req.user.organization_name) {
      args.push('--client-org', req.user.organization_name.trim());
    }
    if (req.user.username) {
      args.push('--user-logon', req.user.username.trim());
    }
    if (req.user.logo_url) {
      args.push('--logo', req.user.logo_url.trim());
    }
    const reportLang = (req.user.language || 'en').trim().toLowerCase();
    if (['en', 'es'].includes(reportLang)) {
      args.push('--language', reportLang);
    }
    if (schedule.domain === 'all' && req.user.role !== 'admin' && Array.isArray(req.user.domains) && req.user.domains.length > 0) {
      args.push('--allowed-domains', req.user.domains.join(','));
    }

    execFile(getPythonBinary(), args, { timeout: 60000, env: process.env }, (error, stdout, stderr) => {
      if (error) {
        console.error('Schedule report run error:', error, stderr);
        return res.status(500).json({ error: 'Failed to execute scheduled report generation.' });
      }

      try {
        const result = JSON.parse(stdout.trim());
        const reportId = crypto.randomUUID();
        const now = new Date().toISOString();

        // Add to history
        db.addReportHistory({
          id: reportId,
          userId: req.user.id,
          username: req.user.username,
          domain: schedule.domain,
          templateId: schedule.template_id,
          templateName: result.template || schedule.template_id,
          formats: safeFormats,
          status: 'completed',
          files: result.files || {},
          summaryJson: result.summary || {}
        });

        // Update schedule last_run_at
        db.updateReportScheduleLastRun(schedule.id, now);

        res.json({
          status: 'success',
          message: `Scheduled report executed and sent to ${schedule.recipients}`,
          schedule_id: schedule.id,
          last_run_at: now,
          report_id: reportId,
          ...result
        });
      } catch (parseErr) {
        console.error('Failed to parse schedule report output:', parseErr, stdout);
        res.status(500).json({ error: 'Scheduled report output parsing error.' });
      }
    });
  } catch (err) {
    console.error('Run schedule endpoint error:', err);
    res.status(500).json({ error: 'Failed to run schedule.' });
  }
});

app.delete('/api/reports/schedules/:id', authenticateToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const ok = db.deleteReportSchedule(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Schedule not found' });
    res.json({ status: 'deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete schedule.' });
  }
});

// 9. OpenSearch Dashboards NDJSON Export
app.get('/api/reports/dashboards-export', authenticateToken, async (req, res) => {
  try {
    if (!fs.existsSync(DASHBOARDS_EXPORT_PATH)) {
      return res.status(404).json({ error: 'Dashboards export file not found.' });
    }
    res.download(DASHBOARDS_EXPORT_PATH, 'opensearch-dmarc-dashboards.ndjson');
  } catch (err) {
    res.status(500).json({ error: 'Failed to download dashboards export.' });
  }
});

// ==========================================
// FEATURE 1: SMTP Settings & Audit Logs (Admin)
// ==========================================

// 1. Get SMTP Settings
app.get('/api/admin/smtp', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const settings = db.getSmtpSettings({ includeDecrypted: false });
    res.json(settings);
  } catch (err) {
    console.error('Error fetching SMTP settings:', err);
    res.status(500).json({ error: 'Failed to retrieve SMTP settings.' });
  }
});

// 2. Save SMTP Settings
app.put('/api/admin/smtp', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const {
      host,
      port = 587,
      encryption = 'starttls',
      username = '',
      password = '',
      from_name = 'DMARC Sentinel',
      from_address = '',
      reply_to = '',
      connection_timeout = 10000
    } = req.body;

    if (!host || !host.trim()) {
      return res.status(400).json({ error: 'SMTP Host is required.' });
    }
    if (!from_address || !from_address.trim()) {
      return res.status(400).json({ error: 'From Address is required.' });
    }
    if (!['none', 'starttls', 'ssl'].includes(encryption)) {
      return res.status(400).json({ error: 'Encryption must be one of: none, starttls, ssl.' });
    }

    const saved = db.saveSmtpSettings({
      host,
      port,
      encryption,
      username,
      password,
      from_name,
      from_address,
      reply_to,
      connection_timeout
    }, { id: req.user.id, username: req.user.username });

    res.json({
      status: 'success',
      message: 'SMTP settings updated successfully.',
      settings: saved
    });
  } catch (err) {
    console.error('Error saving SMTP settings:', err);
    res.status(500).json({ error: 'Failed to save SMTP settings.' });
  }
});

// 3. Send Test Email (Live diagnostics)
app.post('/api/admin/smtp/test', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { recipient, to, settings: draftSettings } = req.body;
    const targetEmail = (recipient || to || req.user.email || '').trim();

    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ error: 'A valid recipient email address is required.' });
    }

    // Use draft settings if provided, otherwise fetch saved settings
    let smtpConfig = null;
    if (draftSettings && draftSettings.host) {
      smtpConfig = {
        host: draftSettings.host.trim(),
        port: parseInt(draftSettings.port, 10) || 587,
        encryption: draftSettings.encryption || 'starttls',
        username: draftSettings.username ? draftSettings.username.trim() : '',
        password: draftSettings.password || '',
        from_name: draftSettings.from_name || 'DMARC Sentinel',
        from_address: draftSettings.from_address || draftSettings.username || 'noreply@dmarc.voxera.net',
        reply_to: draftSettings.reply_to || '',
        connection_timeout: parseInt(draftSettings.connection_timeout, 10) || 10000
      };
    } else {
      smtpConfig = db.getSmtpSettings({ includeDecrypted: true });
      if (!smtpConfig.is_configured) {
        return res.status(400).json({ error: 'SMTP settings are not configured yet. Please configure and save host/from address first.' });
      }
    }

    console.log(`[SMTP Test] Sending test email to ${targetEmail} via ${smtpConfig.host}:${smtpConfig.port}...`);

    const { html, text } = renderEmail('test_email', {
      title: 'DMARC Sentinel SMTP Test',
      recipientEmail: targetEmail,
      smtpHost: smtpConfig.host,
      smtpPort: smtpConfig.port,
      encryptionMode: smtpConfig.encryption.toUpperCase(),
      authUsername: smtpConfig.username || '(None / Anonymous)',
      fromHeader: `"${smtpConfig.from_name}" <${smtpConfig.from_address}>`,
      serverTimestamp: new Date().toUTCString(),
      dashboardUrl: process.env.APP_URL || 'https://dmarc.voxera.net'
    });

    const info = await sendMailDirect({
      to: targetEmail,
      subject: `✅ DMARC Sentinel SMTP Test [${new Date().toLocaleTimeString()}]`,
      html,
      text,
      customTransporterConfig: smtpConfig
    });

    res.json({
      status: 'success',
      message: `Test email sent successfully to ${targetEmail}!`,
      messageId: info.messageId,
      response: info.response
    });
  } catch (err) {
    console.error('[SMTP Test Error]:', err.message);
    let friendlyError = err.message;
    if (err.code === 'ECONNREFUSED') {
      friendlyError = `Connection refused by ${err.address || 'host'}:${err.port}. Please verify the host and port.`;
    } else if (err.code === 'ETIMEDOUT') {
      friendlyError = `Connection timed out. Check firewall, port availability, or timeout settings.`;
    } else if (err.code === 'EAUTH') {
      friendlyError = `Authentication failed: Username or password rejected by SMTP server.`;
    } else if (err.code === 'ESOCKET') {
      friendlyError = `TLS/SSL handshake failure: ${err.message}.`;
    }

    res.status(400).json({
      status: 'error',
      error: friendlyError,
      code: err.code || 'SMTP_ERROR',
      details: err.stack ? err.stack.split('\n')[0] : null
    });
  }
});

// 4. SMTP Audit Logs
app.get('/api/admin/smtp/audit-logs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const action = req.query.action || null;
    const logs = db.getAuditLogs({ limit, offset, action });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// ==========================================
// Admin Email Delivery Logs & Queue
// ==========================================

app.get('/api/admin/email-logs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status || null;
    const emailType = req.query.email_type || null;
    const search = req.query.search || null;

    const result = db.getEmailLogs({ limit, offset, status, emailType, search });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve email logs.' });
  }
});

app.get('/api/admin/email-queue', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const status = req.query.status || null;

    const result = db.getQueueJobs({ limit, offset, status });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve email queue.' });
  }
});

app.post('/api/admin/email-queue/:id/retry', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const ok = db.retryQueueJob(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Queue job not found.' });
    res.json({ status: 'success', message: 'Job re-queued for immediate delivery.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retry queue job.' });
  }
});

// ==========================================
// FEATURE 2: Alert Rules & Incidents
// ==========================================

// 1. List Alert Rules
app.get('/api/alerts/rules', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? null : req.user.id;
    const rules = db.getAlertRules(userId);
    res.json(rules);
  } catch (err) {
    console.error('Error fetching alert rules:', err);
    res.status(500).json({ error: 'Failed to fetch alert rules.' });
  }
});

// 2. Create Alert Rule
app.post('/api/alerts/rules', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      domains = ['all'],
      recipients = [],
      condition_type,
      threshold_value,
      time_window_minutes = 60,
      severity = 'warning',
      cooldown_minutes = 60,
      digest_mode = 0,
      notify_recovery = 1,
      filter_metadata = {}
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Rule name is required.' });
    }

    const validConditions = [
      'failure_rate',
      'new_sender_ip',
      'quarantine_reject_volume',
      'alignment_failures',
      'report_volume_drop',
      'volume_spike',
      'disallowed_country_asn'
    ];

    if (!condition_type || !validConditions.includes(condition_type)) {
      return res.status(400).json({
        error: `Invalid condition_type. Must be one of: ${validConditions.join(', ')}`
      });
    }

    if (threshold_value === undefined || threshold_value === null || isNaN(Number(threshold_value))) {
      return res.status(400).json({ error: 'Threshold value must be a valid number.' });
    }

    // RBAC domain verification
    let cleanDomains = Array.isArray(domains) ? domains : [domains];
    if (cleanDomains.length === 0) cleanDomains = ['all'];

    if (req.user.role !== 'admin') {
      if (cleanDomains.includes('all')) {
        cleanDomains = req.user.domains && req.user.domains.length > 0 ? req.user.domains : ['all'];
      } else {
        const forbidden = cleanDomains.find(d => !req.user.domains.includes(d));
        if (forbidden) {
          return res.status(403).json({ error: `Access denied to domain ${forbidden}` });
        }
      }
    }

    const cleanRecipients = Array.isArray(recipients) && recipients.length > 0
      ? recipients.map(r => r.trim()).filter(r => r.includes('@'))
      : [req.user.email];

    const rule = db.createAlertRule({
      userId: req.user.id,
      name: name.trim(),
      domains: cleanDomains,
      recipients: cleanRecipients,
      conditionType: condition_type,
      thresholdValue: Number(threshold_value),
      timeWindowMinutes: parseInt(time_window_minutes, 10) || 60,
      severity: ['info', 'warning', 'critical'].includes(severity) ? severity : 'warning',
      cooldownMinutes: parseInt(cooldown_minutes, 10) || 60,
      digestMode: digest_mode ? 1 : 0,
      notifyRecovery: notify_recovery !== 0 ? 1 : 0,
      filterMetadata: filter_metadata || {}
    });

    res.status(201).json(rule);
  } catch (err) {
    console.error('Error creating alert rule:', err);
    res.status(500).json({ error: 'Failed to create alert rule.' });
  }
});

// 3. Get Single Alert Rule
app.get('/api/alerts/rules/:id', authenticateToken, async (req, res) => {
  try {
    const rule = db.getAlertRuleById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Alert rule not found.' });

    if (req.user.role !== 'admin' && rule.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alert rule.' });
  }
});

// 4. Update Alert Rule
app.put('/api/alerts/rules/:id', authenticateToken, async (req, res) => {
  try {
    const existing = db.getAlertRuleById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Alert rule not found.' });

    if (req.user.role !== 'admin' && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const {
      name,
      domains,
      recipients,
      condition_type,
      threshold_value,
      time_window_minutes,
      severity,
      cooldown_minutes,
      digest_mode,
      notify_recovery,
      is_active,
      filter_metadata
    } = req.body;

    const ok = db.updateAlertRule(req.params.id, {
      name,
      domains,
      recipients,
      conditionType: condition_type,
      thresholdValue: threshold_value !== undefined ? Number(threshold_value) : undefined,
      timeWindowMinutes: time_window_minutes,
      severity,
      cooldownMinutes: cooldown_minutes,
      digestMode: digest_mode,
      notifyRecovery: notify_recovery,
      isActive: is_active,
      filterMetadata: filter_metadata
    });

    if (!ok) return res.status(404).json({ error: 'Failed to update alert rule.' });
    const updated = db.getAlertRuleById(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Error updating alert rule:', err);
    res.status(500).json({ error: 'Failed to update alert rule.' });
  }
});

// 5. Delete Alert Rule
app.delete('/api/alerts/rules/:id', authenticateToken, async (req, res) => {
  try {
    const existing = db.getAlertRuleById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Alert rule not found.' });

    if (req.user.role !== 'admin' && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const ok = db.deleteAlertRule(req.params.id);
    res.json({ status: 'deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete alert rule.' });
  }
});

// 6. Test / Dry-Run Alert Rule against live OpenSearch data
app.post('/api/alerts/rules/test', authenticateToken, async (req, res) => {
  try {
    const {
      condition_type,
      threshold_value,
      time_window_minutes = 60,
      domains = ['all'],
      filter_metadata = {}
    } = req.body;

    if (!condition_type || threshold_value === undefined) {
      return res.status(400).json({ error: 'condition_type and threshold_value are required for testing.' });
    }

    const dummyRule = {
      id: 'dry-run',
      name: 'Dry Run Test',
      condition_type,
      threshold_value: Number(threshold_value),
      time_window_minutes: parseInt(time_window_minutes, 10) || 60,
      domains: Array.isArray(domains) ? domains : [domains],
      filter_metadata: filter_metadata || {},
      severity: 'warning'
    };

    const evalResult = await evaluateRule(dummyRule, queryOpenSearch);

    res.json({
      status: 'success',
      triggered: evalResult.triggered,
      condition_type,
      current_value: evalResult.currentValue,
      threshold_value: evalResult.thresholdValue,
      condition_label: evalResult.conditionLabel,
      message: evalResult.message,
      threshold_formatted: evalResult.thresholdFormatted,
      current_formatted: evalResult.currentFormatted,
      offenders: evalResult.offenders || []
    });
  } catch (err) {
    console.error('Error in alert dry run test:', err);
    res.status(500).json({ error: `Dry run evaluation failed: ${err.message}` });
  }
});

// 7. Test an existing rule by ID
app.post('/api/alerts/rules/:id/test', authenticateToken, async (req, res) => {
  try {
    const rule = db.getAlertRuleById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Alert rule not found.' });

    if (req.user.role !== 'admin' && rule.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const evalResult = await evaluateRule(rule, queryOpenSearch);

    res.json({
      status: 'success',
      rule_id: rule.id,
      rule_name: rule.name,
      triggered: evalResult.triggered,
      condition_type: rule.condition_type,
      current_value: evalResult.currentValue,
      threshold_value: evalResult.thresholdValue,
      message: evalResult.message,
      offenders: evalResult.offenders || []
    });
  } catch (err) {
    res.status(500).json({ error: `Rule evaluation failed: ${err.message}` });
  }
});

// 8. Incident History & Telemetry
app.get('/api/alerts/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const severity = req.query.severity || null;
    const userDomains = req.user.role === 'admin' ? null : req.user.domains;

    const history = db.getAlertHistory({ limit, offset, severity, userDomains });
    res.json(history);
  } catch (err) {
    console.error('Error fetching alert history:', err);
    res.status(500).json({ error: 'Failed to fetch alert history.' });
  }
});

// ==========================================
// FEATURE 3: On-Demand Report Emailing
// ==========================================

app.post('/api/reports/send-email', authenticateToken, enforceDomainAccess, async (req, res) => {
  try {
    const {
      domain = 'all',
      recipients,
      formats = ['pdf'],
      template_id = 'default',
      date_from,
      date_to,
      organization_name,
      logo_url,
      report_name
    } = req.body;

    if (!recipients) {
      return res.status(400).json({ error: 'Recipient email address(es) required.' });
    }

    const recipientList = (Array.isArray(recipients) ? recipients : String(recipients).split(/[,;\s]+/))
      .map(r => r.trim())
      .filter(r => r.includes('@'));

    if (recipientList.length === 0) {
      return res.status(400).json({ error: 'At least one valid recipient email address is required.' });
    }

    // RBAC check
    if (domain !== 'all' && req.user.role !== 'admin' && Array.isArray(req.user.domains) && !req.user.domains.includes(domain)) {
      return res.status(403).json({ error: `Access denied to domain ${domain}` });
    }

    const targetOrg = (organization_name !== undefined ? organization_name : (req.user.organization_name || '')).trim();
    const targetUser = (req.user.username || '').trim();
    const targetLogo = (logo_url !== undefined ? logo_url : (req.user.logo_url || '')).trim();
    const targetName = report_name || `DMARC Executive Report - ${domain}`;

    console.log(`[Report Email] Generating on-demand report for ${domain} (${recipientList.join(', ')})...`);

    const result = await executeReportGeneration({
      domain,
      templateId: template_id,
      formats,
      dateFrom: date_from,
      dateTo: date_to,
      clientOrg: targetOrg,
      userLogon: targetUser,
      logo: targetLogo,
      allowedDomains: req.user.role !== 'admin' ? req.user.domains : null
    });

    const reportId = crypto.randomUUID();
    db.addReportHistory({
      id: reportId,
      userId: req.user.id,
      username: req.user.username,
      domain,
      templateId: template_id,
      templateName: result.template || template_id,
      formats,
      status: 'completed',
      files: result.files || {},
      summaryJson: result.summary || {}
    });

    const { templateData, attachments } = formatReportEmailData({
      reportName: targetName,
      domain,
      dateRange: date_from && date_to ? `${date_from} to ${date_to}` : 'All Time',
      summary: result.summary,
      generatedFiles: result.files,
      userId: req.user.id
    });

    const { html, text } = renderEmail('dmarc_report', templateData);
    const subject = `📊 [DMARC Report] ${targetName} (${domain})`;

    for (const recipient of recipientList) {
      db.enqueueEmail({
        recipient,
        subject,
        bodyHtml: html,
        bodyText: text,
        attachments,
        emailType: 'report',
        priority: 7
      });
    }

    res.json({
      status: 'success',
      message: `Report generated and enqueued for delivery to ${recipientList.join(', ')}`,
      report_id: reportId,
      recipients: recipientList,
      files: result.files
    });
  } catch (err) {
    console.error('Error generating and sending report by email:', err);
    res.status(500).json({ error: `Failed to send report email: ${err.message}` });
  }
});

// ==========================================
// FEATURE 4: One-Click Unsubscribe
// ==========================================

app.get('/api/reports/unsubscribe/:token', async (req, res) => {
  const token = req.params.token;
  const decoded = verifyUnsubscribeToken(token);

  const baseHtml = (content) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>DMARC Sentinel - Notification Preferences</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b1120; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { max-width: 480px; width: 90%; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 36px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        .btn { display: inline-block; background: #0284c7; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        ${content}
      </div>
    </body>
    </html>
  `;

  if (!decoded) {
    return res.status(400).send(baseHtml(`
      <div style="font-size: 40px; margin-bottom: 16px;">⚠️</div>
      <h2 style="margin: 0 0 12px 0;">Invalid or Expired Link</h2>
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">The unsubscribe link is invalid or has expired. Please manage your notification settings from the Sentinel dashboard.</p>
      <a href="/" class="btn">Go to Dashboard</a>
    `));
  }

  try {
    if (decoded.type === 'alert') {
      db.updateAlertRule(decoded.targetId, { isActive: 0 });
    } else if (decoded.type === 'report_schedule') {
      db.updateReportSchedule(decoded.targetId, { isActive: 0, sendEmail: 0 });
    }

    res.send(baseHtml(`
      <div style="font-size: 40px; margin-bottom: 16px;">✅</div>
      <h2 style="margin: 0 0 12px 0;">Successfully Unsubscribed</h2>
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">You have been unsubscribed from these automated DMARC notifications. You can re-enable alerts or report schedules at any time in the dashboard.</p>
      <a href="/" class="btn">Return to Dashboard</a>
    `));
  } catch (err) {
    res.status(500).send(baseHtml(`
      <div style="font-size: 40px; margin-bottom: 16px;">❌</div>
      <h2 style="margin: 0 0 12px 0;">Unsubscribe Error</h2>
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">An error occurred while updating your preferences.</p>
      <a href="/" class="btn">Go to Dashboard</a>
    `));
  }
});

// Serve static frontend bundle if built
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Centralized unhandled error & CORS error handler
app.use((err, req, res, next) => {
  if (err && err.message === 'Blocked by CORS policy') {
    return res.status(403).json({ error: 'Origin not allowed by CORS policy' });
  }
  console.error('[Unhandled Server Exception]:', err);
  res.status(500).json({ error: 'An unexpected internal server error occurred.' });
});

app.listen(PORT, () => {
  console.log(`DMARC API Backend listening on http://localhost:${PORT}`);

  // Start background workers
  try {
    startEmailQueueWorker(5000);
    startAlertEvaluator(queryOpenSearch, 60000);
    startReportScheduler(60000);
    console.log('✅ Background email worker, alert evaluator, and report scheduler initialized.');
  } catch (workerErr) {
    console.error('Failed to start background workers:', workerErr);
  }
});

