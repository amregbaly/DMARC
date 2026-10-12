import db from '../db.js';
import { renderEmail, generateUnsubscribeToken } from '../services/emailService.js';

const APP_URL = process.env.APP_URL || 'https://dmarc.voxera.net';

/**
 * Format date in ISO string minus N minutes.
 */
function getWindowStartDate(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

/**
 * Build base domain filter query for OpenSearch.
 */
function buildDomainFilter(domains) {
  if (!Array.isArray(domains) || domains.length === 0 || domains.includes('all')) {
    return null;
  }
  if (domains.length === 1) {
    return { term: { 'header_from.keyword': domains[0] } };
  }
  return { terms: { 'header_from.keyword': domains } };
}

/**
 * Evaluate condition 1: DMARC Failure Rate
 */
async function evaluateFailureRate(rule, queryOpenSearch) {
  const windowStart = getWindowStartDate(rule.time_window_minutes);
  const domainFilter = buildDomainFilter(rule.domains);

  const must = [{ range: { date_begin: { gte: windowStart } } }];
  if (domainFilter) must.push(domainFilter);

  const body = {
    size: 0,
    query: { bool: { must } },
    aggs: {
      total: { sum: { field: 'message_count' } },
      failed: {
        filter: { term: { passed_dmarc: false } },
        aggs: {
          count: { sum: { field: 'message_count' } },
          offenders: {
            terms: { field: 'source_ip_address.keyword', size: 5 },
            aggs: {
              vol: { sum: { field: 'message_count' } },
              org: { terms: { field: 'source_name.keyword', size: 1 } },
              country: { terms: { field: 'source_country.keyword', size: 1 } }
            }
          }
        }
      }
    }
  };

  const res = await queryOpenSearch('_search', body);
  const total = res.aggregations?.total?.value || 0;
  const failed = res.aggregations?.failed?.count?.value || 0;
  const rate = total > 0 ? (failed / total) * 100 : 0;
  const roundedRate = Math.round(rate * 100) / 100;

  const offenders = (res.aggregations?.failed?.offenders?.buckets || []).map(b => ({
    ip: b.key,
    count: b.vol?.value || 0,
    org: b.org?.buckets?.[0]?.key || 'Unknown',
    country: b.country?.buckets?.[0]?.key || 'XX',
    asn: 'N/A',
    disposition: 'fail'
  }));

  const triggered = total > 0 && roundedRate >= rule.threshold_value;

  return {
    triggered,
    currentValue: roundedRate,
    thresholdValue: rule.threshold_value,
    currentFormatted: `${roundedRate}%`,
    thresholdFormatted: `${rule.threshold_value}%`,
    conditionLabel: 'DMARC Failure Rate',
    message: triggered
      ? `DMARC failure rate of ${roundedRate}% exceeded threshold of ${rule.threshold_value}% (out of ${total} total messages).`
      : `DMARC failure rate is normal at ${roundedRate}% (threshold: ${rule.threshold_value}%).`,
    offenders
  };
}

/**
 * Evaluate condition 2: New unseen source IP sending as domain
 */
async function evaluateNewSenderIp(rule, queryOpenSearch) {
  const windowStart = getWindowStartDate(rule.time_window_minutes);
  const baselineStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  const domainFilter = buildDomainFilter(rule.domains);

  // 1. Fetch recent IPs in window
  const recentMust = [{ range: { date_begin: { gte: windowStart } } }];
  if (domainFilter) recentMust.push(domainFilter);

  const recentRes = await queryOpenSearch('_search', {
    size: 0,
    query: { bool: { must: recentMust } },
    aggs: {
      recent_ips: {
        terms: { field: 'source_ip_address.keyword', size: 50 },
        aggs: { vol: { sum: { field: 'message_count' } } }
      }
    }
  });

  const recentBuckets = recentRes.aggregations?.recent_ips?.buckets || [];
  if (recentBuckets.length === 0) {
    return {
      triggered: false,
      currentValue: 0,
      thresholdValue: rule.threshold_value,
      currentFormatted: '0 IPs',
      thresholdFormatted: `${rule.threshold_value} new IPs`,
      conditionLabel: 'New Unseen Source IP',
      message: 'No traffic observed in the current window.',
      offenders: []
    };
  }

  const recentIpList = recentBuckets.map(b => b.key);

  // 2. Query historical baseline for these IPs (prior to recent window)
  const baselineMust = [
    { range: { date_begin: { gte: baselineStart, lt: windowStart } } },
    { terms: { 'source_ip_address.keyword': recentIpList } }
  ];
  if (domainFilter) baselineMust.push(domainFilter);

  const baselineRes = await queryOpenSearch('_search', {
    size: 0,
    query: { bool: { must: baselineMust } },
    aggs: { known_ips: { terms: { field: 'source_ip_address.keyword', size: 50 } } }
  });

  const knownIps = new Set((baselineRes.aggregations?.known_ips?.buckets || baselineRes.aggregations?.baseline_ips?.buckets || []).map(b => b.key));
  const newIps = recentBuckets.filter(b => !knownIps.has(b.key));
  const newIpCount = newIps.length;
  const triggered = newIpCount >= rule.threshold_value;

  const offenders = newIps.slice(0, 5).map(b => ({
    ip: b.key,
    count: b.vol?.value || 0,
    country: 'Unknown',
    asn: 'N/A',
    disposition: 'unseen'
  }));

  return {
    triggered,
    currentValue: newIpCount,
    thresholdValue: rule.threshold_value,
    currentFormatted: `${newIpCount} new IPs`,
    thresholdFormatted: `${rule.threshold_value} new IPs`,
    conditionLabel: 'New Unseen Source IP',
    message: triggered
      ? `Detected ${newIpCount} previously unseen sending IP(s) in the last ${rule.time_window_minutes} minutes.`
      : `No new unseen source IPs detected.`,
    offenders
  };
}

/**
 * Evaluate condition 3: Quarantine / Reject Volume
 */
async function evaluateQuarantineRejectVolume(rule, queryOpenSearch) {
  const windowStart = getWindowStartDate(rule.time_window_minutes);
  const domainFilter = buildDomainFilter(rule.domains);

  const must = [
    { range: { date_begin: { gte: windowStart } } },
    { terms: { 'disposition.keyword': ['quarantine', 'reject'] } }
  ];
  if (domainFilter) must.push(domainFilter);

  const res = await queryOpenSearch('_search', {
    size: 0,
    query: { bool: { must } },
    aggs: {
      blocked_vol: { sum: { field: 'message_count' } },
      offenders: {
        terms: { field: 'source_ip_address.keyword', size: 5 },
        aggs: {
          vol: { sum: { field: 'message_count' } },
          disp: { terms: { field: 'disposition.keyword', size: 1 } }
        }
      }
    }
  });

  const volume = res.aggregations?.blocked_vol?.value ?? res.aggregations?.quarantine_reject?.count?.value ?? res.aggregations?.quarantine_reject?.value ?? 0;
  const triggered = volume >= rule.threshold_value;

  const offenders = (res.aggregations?.offenders?.buckets || []).map(b => ({
    ip: b.key,
    count: b.vol?.value || 0,
    country: 'XX',
    asn: 'N/A',
    disposition: b.disp?.buckets?.[0]?.key || 'reject'
  }));

  return {
    triggered,
    currentValue: volume,
    thresholdValue: rule.threshold_value,
    currentFormatted: `${volume} msgs`,
    thresholdFormatted: `${rule.threshold_value} msgs`,
    conditionLabel: 'Quarantine/Reject Disposition Volume',
    message: triggered
      ? `High volume of quarantined or rejected emails: ${volume} messages (threshold: ${rule.threshold_value}).`
      : `Quarantine/Reject count is normal at ${volume} messages.`,
    offenders
  };
}

/**
 * Evaluate condition 4: SPF / DKIM Alignment Failures
 */
async function evaluateAlignmentFailures(rule, queryOpenSearch) {
  const windowStart = getWindowStartDate(rule.time_window_minutes);
  const domainFilter = buildDomainFilter(rule.domains);

  const must = [
    { range: { date_begin: { gte: windowStart } } },
    {
      bool: {
        should: [
          { term: { spf_aligned: false } },
          { term: { dkim_aligned: false } }
        ],
        minimum_should_match: 1
      }
    }
  ];
  if (domainFilter) must.push(domainFilter);

  const res = await queryOpenSearch('_search', {
    size: 0,
    query: { bool: { must } },
    aggs: {
      unaligned_vol: { sum: { field: 'message_count' } },
      offenders: {
        terms: { field: 'source_ip_address.keyword', size: 5 },
        aggs: { vol: { sum: { field: 'message_count' } } }
      }
    }
  });

  const count = res.aggregations?.unaligned_vol?.value ?? res.aggregations?.unaligned?.count?.value ?? res.aggregations?.unaligned?.value ?? 0;
  const triggered = count >= rule.threshold_value;

  const offenders = (res.aggregations?.offenders?.buckets || []).map(b => ({
    ip: b.key,
    count: b.vol?.value || 0,
    country: 'XX',
    asn: 'N/A',
    disposition: 'unaligned'
  }));

  return {
    triggered,
    currentValue: count,
    thresholdValue: rule.threshold_value,
    currentFormatted: `${count} msgs`,
    thresholdFormatted: `${rule.threshold_value} msgs`,
    conditionLabel: 'SPF/DKIM Alignment Failures',
    message: triggered
      ? `Detected ${count} messages failing SPF or DKIM alignment (threshold: ${rule.threshold_value}).`
      : `Alignment failure volume is normal at ${count} messages.`,
    offenders
  };
}

/**
 * Evaluate condition 5: Report Volume Drop
 */
async function evaluateReportVolumeDrop(rule, queryOpenSearch) {
  const windowMins = rule.time_window_minutes;
  const currentStart = getWindowStartDate(windowMins);
  const previousStart = getWindowStartDate(windowMins * 2);
  const domainFilter = buildDomainFilter(rule.domains);

  const currentMust = [{ range: { date_begin: { gte: currentStart } } }];
  if (domainFilter) currentMust.push(domainFilter);

  const prevMust = [{ range: { date_begin: { gte: previousStart, lt: currentStart } } }];
  if (domainFilter) prevMust.push(domainFilter);

  const [currentRes, prevRes] = await Promise.all([
    queryOpenSearch('_search', {
      size: 0,
      query: { bool: { must: currentMust } },
      aggs: {
        vol: { sum: { field: 'message_count' } },
        report_count: { cardinality: { field: 'report_id.keyword' } }
      }
    }),
    queryOpenSearch('_search', {
      size: 0,
      query: { bool: { must: prevMust } },
      aggs: {
        vol: { sum: { field: 'message_count' } },
        report_count: { cardinality: { field: 'report_id.keyword' } }
      }
    })
  ]);

  const currentVol = currentRes.aggregations?.vol?.value ?? currentRes.aggregations?.volume?.value ?? currentRes.aggregations?.report_count?.value ?? 0;
  const prevVol = prevRes.aggregations?.vol?.value ?? prevRes.aggregations?.volume?.value ?? prevRes.aggregations?.report_count?.value ?? 0;

  let dropPercent = 0;
  if (prevVol > 0) {
    dropPercent = Math.max(0, Math.round(((prevVol - currentVol) / prevVol) * 100));
  }

  const triggered = dropPercent >= rule.threshold_value;

  return {
    triggered,
    currentValue: dropPercent,
    thresholdValue: rule.threshold_value,
    currentFormatted: `${dropPercent}% drop`,
    thresholdFormatted: `${rule.threshold_value}% drop`,
    conditionLabel: 'Report / Traffic Volume Drop',
    message: triggered
      ? `Email report / traffic volume dropped by ${dropPercent}% compared to previous period (${currentVol} vs ${prevVol} messages).`
      : `Email traffic volume is healthy (${dropPercent}% drop vs previous period).`,
    offenders: []
  };
}

/**
 * Evaluate condition 6: Volume Spike (% increase vs previous period)
 */
async function evaluateVolumeSpike(rule, queryOpenSearch) {
  const windowMins = rule.time_window_minutes;
  const currentStart = getWindowStartDate(windowMins);
  const previousStart = getWindowStartDate(windowMins * 2);
  const domainFilter = buildDomainFilter(rule.domains);

  const currentMust = [{ range: { date_begin: { gte: currentStart } } }];
  if (domainFilter) currentMust.push(domainFilter);

  const prevMust = [{ range: { date_begin: { gte: previousStart, lt: currentStart } } }];
  if (domainFilter) prevMust.push(domainFilter);

  const [currentRes, prevRes] = await Promise.all([
    queryOpenSearch('_search', {
      size: 0,
      query: { bool: { must: currentMust } },
      aggs: { vol: { sum: { field: 'message_count' } } }
    }),
    queryOpenSearch('_search', {
      size: 0,
      query: { bool: { must: prevMust } },
      aggs: { vol: { sum: { field: 'message_count' } } }
    })
  ]);

  const currentVol = currentRes.aggregations?.vol?.value ?? currentRes.aggregations?.volume?.value ?? 0;
  const prevVol = prevRes.aggregations?.vol?.value ?? prevRes.aggregations?.volume?.value ?? 0;

  let spikePercent = 0;
  if (prevVol > 0) {
    spikePercent = Math.round(((currentVol - prevVol) / prevVol) * 100);
  } else if (currentVol > 100) {
    spikePercent = 100;
  }

  const triggered = spikePercent >= rule.threshold_value && (currentVol > 50 || prevVol > 0);

  return {
    triggered,
    currentValue: spikePercent,
    thresholdValue: rule.threshold_value,
    currentFormatted: `+${spikePercent}%`,
    thresholdFormatted: `+${rule.threshold_value}%`,
    conditionLabel: 'Traffic Volume Spike',
    message: triggered
      ? `Sudden volume surge: email traffic increased by ${spikePercent}% (${currentVol} vs ${prevVol} in previous period).`
      : `Volume trend is stable: ${spikePercent}% change vs previous period.`,
    offenders: []
  };
}

/**
 * Evaluate condition 7: Disallowed Country or ASN
 */
async function evaluateDisallowedCountryAsn(rule, queryOpenSearch) {
  const windowStart = getWindowStartDate(rule.time_window_minutes);
  const domainFilter = buildDomainFilter(rule.domains);
  const meta = rule.filter_metadata || {};
  const allowedCountries = Array.isArray(meta.allowed_countries) ? meta.allowed_countries.map(c => c.toUpperCase()) : [];

  const must = [{ range: { date_begin: { gte: windowStart } } }];
  if (domainFilter) must.push(domainFilter);

  const mustNot = [];
  if (allowedCountries.length > 0) {
    mustNot.push({ terms: { 'source_country.keyword': allowedCountries } });
  }

  const res = await queryOpenSearch('_search', {
    size: 0,
    query: { bool: { must, must_not: mustNot } },
    aggs: {
      disallowed_vol: { sum: { field: 'message_count' } },
      countries: {
        terms: { field: 'source_country.keyword', size: 5 },
        aggs: {
          vol: { sum: { field: 'message_count' } },
          ips: { terms: { field: 'source_ip_address.keyword', size: 1 } }
        }
      }
    }
  });

  const count = res.aggregations?.disallowed_vol?.value ?? res.aggregations?.disallowed?.count?.value ?? res.aggregations?.disallowed?.value ?? 0;
  const triggered = count >= rule.threshold_value;

  const offendersBuckets = res.aggregations?.countries?.buckets || res.aggregations?.disallowed?.offenders?.buckets || [];
  const offenders = offendersBuckets.map(b => ({
    ip: b.ips?.buckets?.[0]?.key || (b.key && b.key.includes('.') ? b.key : 'Various'),
    count: b.vol?.value ?? b.count?.value ?? 0,
    country: b.key,
    asn: 'N/A',
    disposition: 'disallowed geo'
  }));

  return {
    triggered,
    currentValue: count,
    thresholdValue: rule.threshold_value,
    currentFormatted: `${count} msgs`,
    thresholdFormatted: `${rule.threshold_value} msgs`,
    conditionLabel: 'Disallowed Origin Country / ASN',
    message: triggered
      ? `Detected ${count} messages originating from unauthorized geolocations outside allowed countries.`
      : `No traffic observed from disallowed countries.`,
    offenders
  };
}

/**
 * Master dispatcher for all 7 rule types.
 */
export async function evaluateRule(rule, queryOpenSearch) {
  switch (rule.condition_type) {
    case 'failure_rate':
      return evaluateFailureRate(rule, queryOpenSearch);
    case 'new_sender_ip':
      return evaluateNewSenderIp(rule, queryOpenSearch);
    case 'quarantine_reject_volume':
      return evaluateQuarantineRejectVolume(rule, queryOpenSearch);
    case 'alignment_failures':
      return evaluateAlignmentFailures(rule, queryOpenSearch);
    case 'report_volume_drop':
      return evaluateReportVolumeDrop(rule, queryOpenSearch);
    case 'volume_spike':
      return evaluateVolumeSpike(rule, queryOpenSearch);
    case 'disallowed_country_asn':
      return evaluateDisallowedCountryAsn(rule, queryOpenSearch);
    default:
      throw new Error(`Unknown alert condition type: "${rule.condition_type}"`);
  }
}

/**
 * Run evaluation tick on all active rules.
 */
export async function runAlertEvaluatorTick(queryOpenSearch) {
  const activeRules = db.getAlertRules().filter(r => r.is_active);
  if (activeRules.length === 0) return;

  const nowMs = Date.now();

  for (const rule of activeRules) {
    try {
      const evalResult = await evaluateRule(rule, queryOpenSearch);
      const isRecovery = !evalResult.triggered && rule.last_state === 'triggered' && rule.notify_recovery;

      if (evalResult.triggered) {
        // Cooldown check: don't re-alert within cooldown window unless state transitioned
        const lastTriggeredMs = rule.last_triggered_at ? new Date(rule.last_triggered_at).getTime() : 0;
        const inCooldown = rule.last_state === 'triggered' && nowMs - lastTriggeredMs < rule.cooldown_minutes * 60 * 1000;

        if (!inCooldown) {
          const historyId = db.addAlertHistory({
            ruleId: rule.id,
            userId: rule.user_id,
            ruleName: rule.name,
            conditionType: rule.condition_type,
            severity: rule.severity,
            currentValue: evalResult.currentValue,
            thresholdValue: evalResult.thresholdValue,
            matchedValues: {
              message: evalResult.message,
              offenders: evalResult.offenders
            },
            isRecovery: 0,
            emailSent: rule.digest_mode ? 0 : 1
          });

          db.updateAlertRuleState(rule.id, {
            lastState: 'triggered',
            lastTriggeredAt: new Date().toISOString(),
            lastValue: evalResult.currentValue
          });

          if (rule.digest_mode) {
            // Stage for daily digest
            db.addAlertDigestItem({
              userId: rule.user_id,
              ruleId: rule.id,
              alertHistoryId: historyId
            });
          } else {
            // Enqueue immediate email notification
            await dispatchAlertEmail({ rule, evalResult, isRecovery: false });
          }
        }
      } else if (isRecovery) {
        // Recovery transition: State restored to normal
        db.addAlertHistory({
          ruleId: rule.id,
          userId: rule.user_id,
          ruleName: rule.name,
          conditionType: rule.condition_type,
          severity: 'info',
          currentValue: evalResult.currentValue,
          thresholdValue: evalResult.thresholdValue,
          matchedValues: { message: 'Condition restored to normal.' },
          isRecovery: 1,
          emailSent: 1
        });

        db.updateAlertRuleState(rule.id, {
          lastState: 'ok',
          lastValue: evalResult.currentValue
        });

        await dispatchAlertEmail({ rule, evalResult, isRecovery: true });
      }
    } catch (err) {
      console.error(`[AlertEvaluator] Error evaluating rule "${rule.name}" (${rule.id}):`, err.message);
    }
  }
}

/**
 * Helper to enqueue email for an alert rule.
 */
async function dispatchAlertEmail({ rule, evalResult, isRecovery }) {
  const recipients = rule.recipients && rule.recipients.length > 0 ? rule.recipients : [rule.owner_email];
  const validRecipients = recipients.filter(Boolean);
  if (validRecipients.length === 0) return;

  const subjectPrefix = isRecovery ? '✅ [RECOVERED]' : `🚨 [${rule.severity.toUpperCase()}]`;
  const subject = `${subjectPrefix} DMARC Alert: ${rule.name}`;

  for (const recipient of validRecipients) {
    const unsubToken = generateUnsubscribeToken({ userId: rule.user_id, type: 'alert', targetId: rule.id });
    const unsubUrl = `${APP_URL}/api/reports/unsubscribe/${unsubToken}`;

    const { html, text } = renderEmail('alert_notification', {
      title: subject,
      ruleName: rule.name,
      domainScope: rule.domains.join(', '),
      timeWindow: rule.time_window_minutes,
      severity: rule.severity,
      severityUpper: rule.severity.toUpperCase(),
      isCritical: rule.severity === 'critical',
      isWarning: rule.severity === 'warning',
      isInfo: rule.severity === 'info',
      isRecovery: isRecovery,
      conditionLabel: evalResult.conditionLabel,
      triggerMessage: evalResult.message,
      thresholdFormatted: evalResult.thresholdFormatted,
      currentValueFormatted: evalResult.currentFormatted,
      triggeredAtFormatted: new Date().toUTCString(),
      hasOffenders: evalResult.offenders && evalResult.offenders.length > 0,
      offendersCount: evalResult.offenders ? evalResult.offenders.length : 0,
      offenders: evalResult.offenders || [],
      dashboardUrl: `${APP_URL}/#threats`,
      unsubscribeUrl: unsubUrl
    });

    db.enqueueEmail({
      recipient,
      subject,
      bodyHtml: html,
      bodyText: text,
      emailType: 'alert',
      priority: rule.severity === 'critical' ? 10 : 5
    });
  }
}

let alertIntervalTimer = null;

export function startAlertEvaluator(queryOpenSearch, intervalMs = 60000) {
  if (alertIntervalTimer) return;
  console.log(`[AlertEvaluator] Started background evaluator (interval: ${intervalMs / 1000}s)`);
  alertIntervalTimer = setInterval(() => {
    runAlertEvaluatorTick(queryOpenSearch).catch(err => {
      console.error('[AlertEvaluator] Error in interval tick:', err);
    });
  }, intervalMs);

  // Initial check 5s after startup
  setTimeout(() => {
    runAlertEvaluatorTick(queryOpenSearch).catch(err => {
      console.error('[AlertEvaluator] Error in initial tick:', err);
    });
  }, 5000);
}

export function stopAlertEvaluator() {
  if (alertIntervalTimer) {
    clearInterval(alertIntervalTimer);
    alertIntervalTimer = null;
  }
}

export default {
  evaluateRule,
  runAlertEvaluatorTick,
  startAlertEvaluator,
  stopAlertEvaluator
};
