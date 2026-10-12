import db from '../db.js';
import { sendMailDirect } from '../services/emailService.js';

// Cache for in-memory recipient rate-limiting and deduplication (sliding 15-min window)
const recentDispatches = new Map(); // key: hash -> timestamp
const recipientRateLimits = new Map(); // key: recipient -> [timestamps]

const DEDUPLICATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_EMAILS_PER_RECIPIENT_HOUR = 20;

function cleanupOldTracking() {
  const now = Date.now();
  for (const [key, timestamp] of recentDispatches.entries()) {
    if (now - timestamp > DEDUPLICATION_WINDOW_MS) {
      recentDispatches.delete(key);
    }
  }
  for (const [recipient, timestamps] of recipientRateLimits.entries()) {
    const fresh = timestamps.filter(t => now - t < 3600 * 1000);
    if (fresh.length === 0) {
      recipientRateLimits.delete(recipient);
    } else {
      recipientRateLimits.set(recipient, fresh);
    }
  }
}

function checkRateLimit(recipient) {
  const now = Date.now();
  const timestamps = (recipientRateLimits.get(recipient) || []).filter(t => now - t < 3600 * 1000);
  if (timestamps.length >= MAX_EMAILS_PER_RECIPIENT_HOUR) {
    return false; // Rate limit exceeded
  }
  timestamps.push(now);
  recipientRateLimits.set(recipient, timestamps);
  return true;
}

function getDedupKey(recipient, subject) {
  return `${recipient.toLowerCase()}:${subject.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

/**
 * Process a single email queue job.
 */
async function processJob(job) {
  const dedupKey = getDedupKey(job.recipient, job.subject);
  const nowMs = Date.now();

  // Deduplication check: ignore duplicate alert/notification within 15 minutes unless it's a test email
  if (job.email_type !== 'test' && recentDispatches.has(dedupKey)) {
    const lastSent = recentDispatches.get(dedupKey);
    if (nowMs - lastSent < DEDUPLICATION_WINDOW_MS) {
      console.log(`[EmailQueue] Skipping duplicate email for ${job.recipient} ("${job.subject}") within 15m window.`);
      db.updateQueueJob(job.id, {
        status: 'sent',
        sentAt: new Date().toISOString(),
        errorMessage: 'Skipped as duplicate within 15 minutes'
      });
      return;
    }
  }

  // Rate limit check
  if (!checkRateLimit(job.recipient)) {
    console.warn(`[EmailQueue] Rate limit reached for ${job.recipient}. Deferring job ${job.id} by 10 minutes.`);
    const deferTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    db.updateQueueJob(job.id, {
      status: 'pending',
      nextRunAt: deferTime,
      errorMessage: 'Rate limit exceeded; deferred by 10 minutes'
    });
    return;
  }

  try {
    const info = await sendMailDirect({
      to: job.recipient,
      subject: job.subject,
      html: job.body_html,
      text: job.body_text,
      attachments: job.attachments
    });

    const now = new Date().toISOString();
    recentDispatches.set(dedupKey, nowMs);

    db.updateQueueJob(job.id, {
      status: 'sent',
      sentAt: now,
      errorMessage: null
    });

    db.addEmailLog({
      recipient: job.recipient,
      subject: job.subject,
      emailType: job.email_type,
      status: 'sent',
      attempts: job.attempts,
      metadata: { messageId: info.messageId, response: info.response }
    });

    console.log(`[EmailQueue] Successfully dispatched email to ${job.recipient} (Type: ${job.email_type}, ID: ${job.id})`);
  } catch (err) {
    console.error(`[EmailQueue] Failed to dispatch email ${job.id} to ${job.recipient}:`, err.message);

    const attempts = job.attempts;
    const maxAttempts = job.max_attempts || 3;

    if (attempts >= maxAttempts) {
      // Mark permanently failed
      db.updateQueueJob(job.id, {
        status: 'failed',
        errorMessage: err.message
      });

      db.addEmailLog({
        recipient: job.recipient,
        subject: job.subject,
        emailType: job.email_type,
        status: 'failed',
        errorMessage: err.message,
        attempts: attempts
      });
    } else {
      // Exponential backoff: 2m for attempt 1, 10m for attempt 2
      const backoffMinutes = attempts === 1 ? 2 : 10;
      const nextRunAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

      db.updateQueueJob(job.id, {
        status: 'pending',
        errorMessage: err.message,
        nextRunAt: nextRunAt
      });
      console.log(`[EmailQueue] Scheduled retry #${attempts + 1} for job ${job.id} in ${backoffMinutes} minutes.`);
    }
  }
}

let isProcessing = false;

/**
 * Single tick of the queue processor.
 */
export async function processQueueTick() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    cleanupOldTracking();
    const jobs = db.claimQueueJobs(5);
    if (jobs.length > 0) {
      for (const job of jobs) {
        await processJob(job);
      }
    }
  } catch (err) {
    console.error('[EmailQueue] Error processing queue tick:', err);
  } finally {
    isProcessing = false;
  }
}

let queueIntervalTimer = null;

export function startEmailQueueWorker(intervalMs = 5000) {
  if (queueIntervalTimer) return;
  console.log('[EmailQueue Worker] Started background worker (poll interval: 5s)');
  queueIntervalTimer = setInterval(processQueueTick, intervalMs);
  // Run first tick immediately
  processQueueTick().catch(() => {});
}

export function stopEmailQueueWorker() {
  if (queueIntervalTimer) {
    clearInterval(queueIntervalTimer);
    queueIntervalTimer = null;
  }
}

export default {
  startEmailQueueWorker,
  stopEmailQueueWorker,
  processQueueTick
};
