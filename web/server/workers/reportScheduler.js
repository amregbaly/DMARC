import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import db from '../db.js';
import { renderEmail, generateUnsubscribeToken } from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_OUTPUT_DIR = path.resolve(__dirname, '../../../reporting/output');
const APP_URL = process.env.APP_URL || 'https://dmarc.voxera.net';
const GRAFANA_URL = process.env.GRAFANA_URL || '';

function getPythonBinary() {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  const venvPython3 = path.resolve(__dirname, '../../../reporting/venv/bin/python3');
  if (fs.existsSync(venvPython3)) return venvPython3;
  const venvPython = path.resolve(__dirname, '../../../reporting/venv/bin/python');
  if (fs.existsSync(venvPython)) return venvPython;
  return 'python3';
}

/**
 * Check if a schedule is due according to time_of_day, timezone, and schedule_type.
 */
function isScheduleDue(schedule) {
  const timeOfDay = schedule.time_of_day || '08:00';
  const tz = schedule.timezone || 'UTC';
  const now = new Date();

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour12: false
    }).formatToParts(now);

    const map = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }

    const [targetHour, targetMinute] = timeOfDay.split(':').map(s => parseInt(s, 10) || 0);
    const currHour = parseInt(map.hour, 10) || 0;
    const currMinute = parseInt(map.minute, 10) || 0;

    const currTotalMinutes = currHour * 60 + currMinute;
    const targetTotalMinutes = targetHour * 60 + targetMinute;
    const diffMinutes = Math.abs(currTotalMinutes - targetTotalMinutes);
    if (diffMinutes > 3) {
      return false;
    }

    if (schedule.last_run_at) {
      const lastRun = new Date(schedule.last_run_at);
      const hoursSinceLastRun = (now - lastRun) / (1000 * 60 * 60);

      if (schedule.schedule_type === 'daily' && hoursSinceLastRun < 20) {
        return false;
      }
      if (schedule.schedule_type === 'weekly' && hoursSinceLastRun < 24 * 6) {
        return false;
      }
      if (schedule.schedule_type === 'monthly' && hoursSinceLastRun < 24 * 25) {
        return false;
      }
    }

    if (schedule.schedule_type === 'weekly') {
      if (map.weekday !== 'Mon') return false;
    } else if (schedule.schedule_type === 'monthly') {
      if (parseInt(map.day, 10) !== 1) return false;
    }

    return true;
  } catch (err) {
    console.error(`[ReportScheduler] Invalid timezone or date error for schedule ${schedule.id}:`, err.message);
    return false;
  }
}

/**
 * Execute report generator python bundle and return parsed result.
 */
export function executeReportGeneration({
  domain = 'all',
  templateId = 'default',
  formats = ['pdf'],
  dateFrom = null,
  dateTo = null,
  clientOrg = '',
  userLogon = '',
  logo = '',
  language = 'en',
  allowedDomains = null
}) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '../../../reporting/report_service.py');
    const safeFormats = Array.isArray(formats) && formats.length > 0 ? formats : ['pdf'];

    const args = [
      scriptPath,
      '--domain', domain,
      '--template', path.basename(templateId),
      '--formats', safeFormats.join(','),
      '--output-dir', REPORTS_OUTPUT_DIR
    ];

    if (clientOrg) args.push('--client-org', clientOrg);
    if (userLogon) args.push('--user-logon', userLogon);
    if (logo) args.push('--logo', logo);
    if (language) args.push('--language', language);
    if (dateFrom) args.push('--date-from', dateFrom);
    if (dateTo) args.push('--date-to', dateTo);
    if (allowedDomains && allowedDomains.length > 0) {
      args.push('--allowed-domains', allowedDomains.join(','));
    }

    execFile(getPythonBinary(), args, { timeout: 90000, env: process.env }, (error, stdout, stderr) => {
      if (error) {
        console.error('[ReportScheduler] Python report generation failed:', error, stderr);
        return reject(new Error(stderr || error.message));
      }
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (parseErr) {
        reject(new Error(`Failed to parse report output: ${parseErr.message}`));
      }
    });
  });
}

/**
 * Format summary metrics for dmarc_report.html template rendering.
 */
export function formatReportEmailData({ reportName, domain, dateRange, summary, generatedFiles, scheduleId, userId }) {
  const total = Number(summary?.total_messages || summary?.total_volume || 0);
  const passed = Number(summary?.passed || 0);
  const failed = Number(summary?.failed || Math.max(0, total - passed));
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '100.0';

  const matrix = summary?.auth_matrix || {};
  const passPass = Number(matrix.pass_pass || 0);
  const passFail = Number(matrix.pass_fail || 0);
  const failPass = Number(matrix.fail_pass || 0);

  const spfAlignedRate = total > 0 ? (((passPass + passFail) / total) * 100).toFixed(1) : '100.0';
  const dkimAlignedRate = total > 0 ? (((passPass + failPass) / total) * 100).toFixed(1) : '100.0';
  const fullyCompliantRate = total > 0 ? ((passPass / total) * 100).toFixed(1) : '100.0';

  const dispNone = Number(summary?.disposition_none || 0).toLocaleString();
  const dispQuarantine = Number(summary?.disposition_quarantine || 0).toLocaleString();
  const dispReject = Number(summary?.disposition_reject || 0).toLocaleString();

  // Top senders / IPs
  const topSourcesRaw = summary?.top_ips || summary?.top_senders || [];
  const topSources = topSourcesRaw.slice(0, 5).map(s => {
    const rate = Number(s.pass_rate || 0);
    return {
      ip: s.ip || s.base_domain || 'Unknown',
      org: s.as_name || s.name || 'External Carrier',
      country: s.country || 'Global',
      count: Number(s.volume || 0).toLocaleString(),
      passRate: rate.toFixed(1),
      passColor: rate >= 90 ? '#34d399' : (rate >= 70 ? '#fbbf24' : '#f87171')
    };
  });

  const attachments = [];
  const attachmentNamesList = [];
  if (generatedFiles && typeof generatedFiles === 'object') {
    for (const [fmt, fileInfo] of Object.entries(generatedFiles)) {
      if (fileInfo?.path && fs.existsSync(fileInfo.path)) {
        attachments.push({
          filename: fileInfo.filename || path.basename(fileInfo.path),
          path: fileInfo.path
        });
        attachmentNamesList.push(`${fmt.toUpperCase()} (${(fileInfo.size_bytes / 1024).toFixed(1)} KB)`);
      }
    }
  }

  const unsubToken = scheduleId ? generateUnsubscribeToken({ userId, type: 'report_schedule', targetId: scheduleId }) : null;
  const unsubUrl = unsubToken ? `${APP_URL}/api/reports/unsubscribe/${unsubToken}` : null;

  return {
    templateData: {
      reportTypeTitle: 'DMARC Executive Intelligence',
      reportName: reportName || 'Enterprise DMARC Compliance Report',
      domain: domain === 'all' ? 'All Monitored Domains' : domain,
      dateRange: dateRange || 'Recent Monitoring Period',
      totalEmailsFormatted: total.toLocaleString(),
      passRateFormatted: passRate,
      failedEmailsFormatted: failed.toLocaleString(),
      hasFailures: failed > 0,
      spfAlignedRate,
      dkimAlignedRate,
      fullyCompliantRate,
      dispositionNone: dispNone,
      dispositionQuarantine: dispQuarantine,
      dispositionReject: dispReject,
      hasTopSources: topSources.length > 0,
      topSources,
      hasAttachments: attachments.length > 0,
      attachmentNames: attachmentNamesList.join(', '),
      dashboardUrl: `${APP_URL}/#reports`,
      grafanaUrl: GRAFANA_URL || null,
      unsubscribeUrl: unsubUrl
    },
    attachments
  };
}

/**
 * Run a single report schedule and enqueue email if requested.
 */
export async function runReportSchedule(schedule) {
  const now = new Date();
  const scheduleType = schedule.schedule_type || 'weekly';

  let daysBack = 7;
  if (scheduleType === 'daily') daysBack = 1;
  else if (scheduleType === 'monthly') daysBack = 30;

  const dateFrom = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dateTo = now.toISOString().split('T')[0];

  console.log(`[ReportScheduler] Running schedule "${schedule.name}" (${schedule.id}) for domain "${schedule.domain}" (${dateFrom} to ${dateTo})`);

  try {
    const result = await executeReportGeneration({
      domain: schedule.domain,
      templateId: schedule.template_id,
      formats: schedule.formats,
      dateFrom,
      dateTo
    });

    const reportId = crypto.randomUUID();
    const timestamp = now.toISOString();

    db.addReportHistory({
      id: reportId,
      userId: schedule.user_id,
      username: 'Scheduler',
      domain: schedule.domain,
      templateId: schedule.template_id,
      templateName: result.template || schedule.template_id,
      formats: schedule.formats,
      status: 'completed',
      files: result.files || {},
      summaryJson: result.summary || {}
    });

    db.updateReportScheduleLastRun(schedule.id, timestamp);

    // Send emails if send_email is enabled
    if (schedule.send_email && schedule.recipients) {
      const recipientList = schedule.recipients
        .split(/[,;\s]+/)
        .map(e => e.trim())
        .filter(e => e.includes('@'));

      if (recipientList.length > 0) {
        const { templateData, attachments } = formatReportEmailData({
          reportName: schedule.name,
          domain: schedule.domain,
          dateRange: `${dateFrom} to ${dateTo}`,
          summary: result.summary,
          generatedFiles: result.files,
          scheduleId: schedule.id,
          userId: schedule.user_id
        });

        const { html, text } = renderEmail('dmarc_report', templateData);
        const subject = `📊 [DMARC Report] ${schedule.name} - ${schedule.domain} (${dateFrom} to ${dateTo})`;

        for (const recipient of recipientList) {
          db.enqueueEmail({
            recipient,
            subject,
            bodyHtml: html,
            bodyText: text,
            attachments,
            emailType: 'report',
            priority: 4
          });
          console.log(`[ReportScheduler] Enqueued scheduled report email to ${recipient}`);
        }
      }
    }

    return { success: true, reportId, result };
  } catch (err) {
    console.error(`[ReportScheduler] Error executing schedule ${schedule.id}:`, err);
    throw err;
  }
}

/**
 * Scan active schedules and run any that are due.
 */
export async function checkAndRunScheduledReports() {
  try {
    const schedules = db.getReportSchedules();
    const activeSchedules = schedules.filter(s => s.is_active === 1 || s.is_active === true);

    for (const schedule of activeSchedules) {
      if (isScheduleDue(schedule)) {
        await runReportSchedule(schedule).catch(err => {
          console.error(`[ReportScheduler] Schedule ${schedule.id} run failure:`, err.message);
        });
      }
    }
  } catch (err) {
    console.error('[ReportScheduler] Error in checkAndRunScheduledReports:', err);
  }
}

/**
 * Check and dispatch daily incident digests to users.
 */
let lastDigestRunDate = '';

export async function checkAndDispatchDailyDigests() {
  try {
    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const currentHour = now.getUTCHours();

    // Run at 08:00 UTC once daily
    if (currentHour === 8 && lastDigestRunDate !== todayDate) {
      lastDigestRunDate = todayDate;
      console.log('[DailyDigest] Running daily alert digests dispatcher...');

      const pendingItems = db.getPendingAlertDigests();
      if (!pendingItems || pendingItems.length === 0) return;

      // Group by user email
      const byUser = new Map();
      for (const item of pendingItems) {
        const email = item.user_email;
        if (!email) continue;
        if (!byUser.has(email)) byUser.set(email, []);
        byUser.get(email).push(item);
      }

      for (const [userEmail, items] of byUser.entries()) {
        const processedIds = items.map(i => i.id);

        const formattedIncidents = items.map(i => {
          return {
            severity: i.severity || 'warning',
            isCritical: i.severity === 'critical',
            isWarning: i.severity === 'warning',
            isInfo: i.severity === 'info',
            ruleName: i.rule_name || 'System Rule',
            conditionLabel: i.condition_type.replace(/_/g, ' ').toUpperCase(),
            currentValueFormatted: typeof i.current_value === 'number' ? i.current_value.toFixed(1) : String(i.current_value),
            thresholdFormatted: typeof i.threshold_value === 'number' ? i.threshold_value.toFixed(1) : String(i.threshold_value),
            timeFormatted: new Date(i.triggered_at).toLocaleTimeString()
          };
        });

        const { html, text } = renderEmail('daily_digest', {
          title: 'Daily DMARC Security Digest',
          userEmail,
          incidentCount: items.length,
          incidents: formattedIncidents,
          dashboardUrl: `${APP_URL}/#threats`
        });

        const subject = `📬 Daily DMARC Security Digest (${items.length} Incidents) - ${todayDate}`;

        db.enqueueEmail({
          recipient: userEmail,
          subject,
          bodyHtml: html,
          bodyText: text,
          emailType: 'digest',
          priority: 3
        });

        db.markAlertDigestsSent(processedIds);
        console.log(`[DailyDigest] Dispatched digest for ${userEmail} (${items.length} incidents)`);
      }
    }
  } catch (err) {
    console.error('[DailyDigest] Error in checkAndDispatchDailyDigests:', err);
  }
}

let schedulerTimer = null;

export function startReportScheduler(intervalMs = 60000) {
  if (schedulerTimer) return;
  console.log('[ReportScheduler] Started background scheduler (tick interval: 60s)');
  schedulerTimer = setInterval(async () => {
    await checkAndRunScheduledReports();
    await checkAndDispatchDailyDigests();
  }, intervalMs);

  // Initial check shortly after startup
  setTimeout(async () => {
    await checkAndRunScheduledReports();
    await checkAndDispatchDailyDigests();
  }, 10000);
}

export function stopReportScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

export default {
  startReportScheduler,
  stopReportScheduler,
  checkAndRunScheduledReports,
  checkAndDispatchDailyDigests,
  runReportSchedule,
  formatReportEmailData,
  executeReportGeneration
};
