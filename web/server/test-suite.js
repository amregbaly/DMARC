import assert from 'node:assert';
import net from 'node:net';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { encrypt, decrypt, maskSecret } from './services/crypto.js';
import {
  renderEmail,
  sanitizeEmailHeader,
  isValidEmail,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  sendMailDirect
} from './services/emailService.js';
import { evaluateRule } from './workers/alertEvaluator.js';
import { formatReportEmailData } from './workers/reportScheduler.js';
import { processQueueTick } from './workers/emailQueueWorker.js';
import {
  matchSaaSymmetricVendor,
  analyzeShadowItAndVendors,
  KNOWN_SAAS_VENDORS,
  simulatePolicyEnforcement,
  detectPredictiveAnomalies,
  optimizeSpfAndBimi
} from './services/aiService.js';

console.log('====================================================');
console.log('🛡️  DMARC Sentinel Email & Alerting Test Suite');
console.log('====================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    testsFailed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    testsFailed++;
  }
}

// ----------------------------------------------------
// 1. CRYPTO & SECRET SECURITY TESTS
// ----------------------------------------------------
console.log('--- 1. Cryptography & Security Tests ---');

runTest('AES-256-GCM encryption & decryption roundtrip', () => {
  const secret = 'SuperSecretSmtpPass!994';
  const ciphertext = encrypt(secret);
  assert.notStrictEqual(ciphertext, secret);
  assert(ciphertext.includes(':'), 'Ciphertext must contain IV:AuthTag:Data separators');
  const decrypted = decrypt(ciphertext);
  assert.strictEqual(decrypted, secret);
});

runTest('AES-256-GCM tamper detection fails gracefully', () => {
  const secret = 'MyPassword123';
  const ciphertext = encrypt(secret);
  const parts = ciphertext.split(':');
  // Corrupt the ciphertext payload
  parts[2] = parts[2].slice(0, -2) + (parts[2].slice(-2) === 'aa' ? 'bb' : 'aa');
  const tampered = parts.join(':');
  assert.throws(() => {
    decrypt(tampered);
  }, /Unsupported state or unable to authenticate data|bad decrypt/);
});

runTest('maskSecret masks string without leaking length', () => {
  const masked = maskSecret('A Very Long Password Here');
  assert.strictEqual(masked, '••••••••');
});

runTest('Header injection sanitization strips CRLF (\r\n)', () => {
  const maliciousHeader = 'admin@voxera.net\r\nBcc: evil@hacker.com\r\nSubject: Injected';
  const clean = sanitizeEmailHeader(maliciousHeader);
  assert(!clean.includes('\r'), 'Must not contain \\r');
  assert(!clean.includes('\n'), 'Must not contain \\n');
  assert.strictEqual(clean, 'admin@voxera.net Bcc: evil@hacker.com Subject: Injected');
});

runTest('Email validation complies with standard RFC checks', () => {
  assert.strictEqual(isValidEmail('sec@voxera.net'), true);
  assert.strictEqual(isValidEmail('user.name+tag@sub.example.com'), true);
  assert.strictEqual(isValidEmail('invalid-email'), false);
  assert.strictEqual(isValidEmail(''), false);
  assert.strictEqual(isValidEmail('evil@domain.com\r\n'), false);
});

runTest('HMAC unsubscribe token generation & verification', () => {
  const payload = { userId: 'usr-123', type: 'alert', targetId: 'alt-999' };
  const token = generateUnsubscribeToken(payload);
  assert(token && token.includes('.'), 'Token must be formatted with signature');

  const verified = verifyUnsubscribeToken(token);
  assert(verified, 'Verification must succeed on valid token');
  assert.strictEqual(verified.userId, 'usr-123');
  assert.strictEqual(verified.targetId, 'alt-999');

  // Corrupted token fails
  const corruptedToken = token.slice(0, -4) + 'zzzz';
  assert.strictEqual(verifyUnsubscribeToken(corruptedToken), null);
});

// ----------------------------------------------------
// 2. TEMPLATE RENDERING TESTS
// ----------------------------------------------------
console.log('\n--- 2. Responsive Email Template Rendering Tests ---');

runTest('Render test_email template with base layout', () => {
  const rendered = renderEmail('test_email', {
    title: 'SMTP Diagnostic Test',
    recipientEmail: 'tester@voxera.net',
    smtpHost: 'smtp.voxera.net',
    smtpPort: 587,
    encryptionMode: 'STARTTLS',
    authUsername: 'dmarc_mailer',
    fromHeader: '"DMARC Sentinel" <noreply@voxera.net>',
    serverTimestamp: new Date().toUTCString(),
    dashboardUrl: 'https://dmarc.voxera.net'
  });
  assert(rendered.html.includes('DMARC Sentinel'), 'HTML must include brand');
  assert(rendered.html.includes('smtp.voxera.net'), 'HTML must include host');
  assert(rendered.text.includes('smtp.voxera.net'), 'Plaintext must include host');
});

runTest('Render alert_notification template with offenders table', () => {
  const rendered = renderEmail('alert_notification', {
    title: '🚨 [CRITICAL] DMARC Alert: Failure Rate Spike',
    ruleName: 'Failure Rate Spike',
    domainScope: 'voxera.net',
    timeWindow: 60,
    severity: 'critical',
    isCritical: true,
    conditionLabel: 'DMARC FAILURE RATE',
    triggerMessage: 'Failure rate reached 25.5%, exceeding threshold of 5.0%',
    thresholdFormatted: '5.0%',
    currentValueFormatted: '25.5%',
    triggeredAtFormatted: new Date().toUTCString(),
    hasOffenders: true,
    offenders: [
      { ip: '198.51.100.4', org: 'Malicious ASN', country: 'RU', vol: 150 }
    ],
    dashboardUrl: 'https://dmarc.voxera.net/#threats',
    unsubscribeUrl: 'https://dmarc.voxera.net/api/reports/unsubscribe/tok123'
  });
  assert(rendered.html.includes('198.51.100.4'), 'Must render offending IP');
  assert(rendered.html.includes('CRITICAL'), 'Must render critical badge');
  assert(rendered.html.includes('unsubscribe'), 'Must render unsubscribe link');
});

runTest('Render dmarc_report executive intelligence email', () => {
  const formatted = formatReportEmailData({
    reportName: 'Weekly Executive Brief',
    domain: 'voxera.net',
    dateRange: '2026-10-01 to 2026-10-08',
    summary: {
      total_messages: 50000,
      passed: 49500,
      failed: 500,
      pass_rate: 99.0,
      disposition_none: 49500,
      disposition_quarantine: 300,
      disposition_reject: 200,
      auth_matrix: { pass_pass: 49000, pass_fail: 500, fail_pass: 0, fail_fail: 500 },
      top_ips: [
        { ip: '209.85.220.41', as_name: 'Google LLC', country: 'US', volume: 30000, pass_rate: 100 }
      ]
    },
    generatedFiles: {
      pdf: { filename: 'report.pdf', path: '/dev/null', size_bytes: 45000 }
    },
    userId: 'usr-admin'
  });

  const rendered = renderEmail('dmarc_report', formatted.templateData);
  assert(rendered.html.includes('50,000'), 'Must format total emails');
  assert(rendered.html.includes('99.0%'), 'Must include pass rate');
  assert(rendered.html.includes('Google LLC'), 'Must include top source');
});

// ----------------------------------------------------
// 3. DATABASE HELPER & RBAC TESTS
// ----------------------------------------------------
console.log('\n--- 3. Database Schema & Helper Tests ---');

runTest('Save and retrieve SMTP settings (password masked in API)', () => {
  db.initDb();
  const testHost = 'smtp-test.example.com';
  const testPassword = 'SecretP@ssword123!';

  db.saveSmtpSettings({
    host: testHost,
    port: 587,
    encryption: 'starttls',
    username: 'mailer',
    password: testPassword,
    from_name: 'Test Sentinel',
    from_address: 'alerts@example.com'
  }, { id: 'admin-1', username: 'admin' });

  // API representation must NEVER contain plaintext password
  const apiSettings = db.getSmtpSettings({ includeDecrypted: false });
  assert.strictEqual(apiSettings.host, testHost);
  assert.strictEqual(apiSettings.password, '••••••••');
  assert.strictEqual(apiSettings.has_password, true);

  // Decrypted representation for Nodemailer
  const internalSettings = db.getSmtpSettings({ includeDecrypted: true });
  assert.strictEqual(internalSettings.password, testPassword);
});

runTest('Audit log recording for SMTP modifications', () => {
  db.addAuditLog({
    userId: 'admin-1',
    username: 'admin',
    action: 'SMTP_CONFIG_UPDATE',
    details: { host: 'smtp.newhost.com', port: 587 },
    ipAddress: '127.0.0.1'
  });

  const logs = db.getAuditLogs({ limit: 5 });
  assert(logs.length > 0);
  assert.strictEqual(logs[0].action, 'SMTP_CONFIG_UPDATE');
  assert.strictEqual(logs[0].username, 'admin');
});

runTest('Alert Rule creation, retrieval, and state update', () => {
  let admin = db.getUserByUsername('admin');
  if (!admin) {
    admin = db.createUser({
      username: 'admin',
      email: 'admin@voxera.net',
      password: 'AdminPassword123!',
      role: 'admin'
    });
  }

  const rule = db.createAlertRule({
    userId: admin.id,
    name: 'Unit Test Alert Rule',
    domains: ['voxera.net'],
    recipients: ['ciso@voxera.net'],
    conditionType: 'failure_rate',
    thresholdValue: 10.0,
    timeWindowMinutes: 30,
    severity: 'critical'
  });

  assert(rule.id, 'Must return created rule with UUID');
  assert.strictEqual(rule.name, 'Unit Test Alert Rule');
  assert.strictEqual(rule.severity, 'critical');

  const retrieved = db.getAlertRuleById(rule.id);
  assert.strictEqual(retrieved.name, 'Unit Test Alert Rule');

  db.updateAlertRuleState(rule.id, { lastState: 'triggered', lastValue: 18.5 });
  const updated = db.getAlertRuleById(rule.id);
  assert.strictEqual(updated.last_state, 'triggered');
  assert.strictEqual(updated.last_value, 18.5);

  // Clean up
  db.deleteAlertRule(rule.id);
});

// ----------------------------------------------------
// 4. ALERT EVALUATOR (7 CONDITIONS) TESTS
// ----------------------------------------------------
console.log('\n--- 4. Alert Evaluator 7 Conditions Logic Tests ---');

// Mock OpenSearch query runner
function createMockOpenSearch(mockResponses) {
  return async (endpoint, body) => {
    return mockResponses(endpoint, body);
  };
}

await runAsyncTest('Condition 1: failure_rate triggers when threshold exceeded', async () => {
  const mockOS = createMockOpenSearch((endpoint, body) => {
    return {
      aggregations: {
        total: { value: 1000 },
        failed: {
          count: { value: 150 }, // 15% failure rate
          offenders: {
            buckets: [{ key: '10.0.0.1', vol: { value: 150 } }]
          }
        }
      }
    };
  });

  const rule = {
    id: 'r1',
    name: 'High Failures',
    condition_type: 'failure_rate',
    threshold_value: 10.0, // 10%
    time_window_minutes: 60,
    domains: ['all']
  };

  const res = await evaluateRule(rule, mockOS);
  assert.strictEqual(res.triggered, true);
  assert.strictEqual(res.currentValue, 15);
  assert(res.message.includes('exceeded threshold'));
});

await runAsyncTest('Condition 2: new_sender_ip detects IPs unseen in 30 days', async () => {
  const mockOS = createMockOpenSearch((endpoint, body) => {
    const isRecentQuery = body.query?.bool?.must?.some(m => m.range?.date_begin?.gte);
    const rangeObj = body.query?.bool?.must?.find(m => m.range?.date_begin)?.range?.date_begin;
    const isBaseline = rangeObj?.lt;

    if (isBaseline) {
      // 30-day baseline seen IPs
      return {
        aggregations: {
          baseline_ips: {
            buckets: [{ key: '192.168.1.1' }, { key: '192.168.1.2' }]
          }
        }
      };
    } else {
      // Recent window IPs: contains an unseen rogue IP 10.99.99.99
      return {
        aggregations: {
          recent_ips: {
            buckets: [
              { key: '192.168.1.1', vol: { value: 50 } },
              { key: '10.99.99.99', vol: { value: 10 }, org: { buckets: [{ key: 'Rogue ISP' }] } }
            ]
          }
        }
      };
    }
  });

  const rule = {
    id: 'r2',
    name: 'New Sender Detection',
    condition_type: 'new_sender_ip',
    threshold_value: 1,
    time_window_minutes: 60,
    domains: ['voxera.net']
  };

  const res = await evaluateRule(rule, mockOS);
  assert.strictEqual(res.triggered, true);
  assert.strictEqual(res.currentValue, 1);
  assert.strictEqual(res.offenders[0].ip, '10.99.99.99');
});

await runAsyncTest('Condition 3: quarantine_reject_volume evaluates properly', async () => {
  const mockOS = createMockOpenSearch(() => ({
    aggregations: {
      quarantine_reject: { count: { value: 75 } }
    }
  }));

  const rule = {
    id: 'r3',
    condition_type: 'quarantine_reject_volume',
    threshold_value: 50,
    time_window_minutes: 60,
    domains: ['all']
  };

  const res = await evaluateRule(rule, mockOS);
  assert.strictEqual(res.triggered, true);
  assert.strictEqual(res.currentValue, 75);
});

await runAsyncTest('Condition 4: alignment_failures triggers on SPF/DKIM fail', async () => {
  const mockOS = createMockOpenSearch(() => ({
    aggregations: {
      unaligned: { count: { value: 45 } }
    }
  }));

  const rule = {
    id: 'r4',
    condition_type: 'alignment_failures',
    threshold_value: 20,
    time_window_minutes: 60,
    domains: ['all']
  };

  const res = await evaluateRule(rule, mockOS);
  assert.strictEqual(res.triggered, true);
  assert.strictEqual(res.currentValue, 45);
});

await runAsyncTest('Condition 5: report_volume_drop triggers when traffic drops 80%', async () => {
  let callCount = 0;
  const mockOS = createMockOpenSearch(() => {
    callCount++;
    if (callCount === 1) {
      return { aggregations: { volume: { value: 200 } } }; // Current window: 200 msgs
    } else {
      return { aggregations: { volume: { value: 1000 } } }; // Previous window: 1000 msgs (80% drop)
    }
  });

  const rule = {
    id: 'r5',
    condition_type: 'report_volume_drop',
    threshold_value: 50, // 50% drop threshold
    time_window_minutes: 60,
    domains: ['all']
  };

  const res = await evaluateRule(rule, mockOS);
  assert.strictEqual(res.triggered, true);
  assert.strictEqual(res.currentValue, 80);
});

await runAsyncTest('Condition 6: volume_spike triggers on 150% surge', async () => {
  let callCount = 0;
  const mockOS = createMockOpenSearch(() => {
    callCount++;
    if (callCount === 1) {
      return { aggregations: { volume: { value: 2500 } } }; // Current window
    } else {
      return { aggregations: { volume: { value: 1000 } } }; // Previous baseline: 150% increase
    }
  });

  const rule = {
    id: 'r6',
    condition_type: 'volume_spike',
    threshold_value: 100, // 100% spike threshold
    time_window_minutes: 60,
    domains: ['all']
  };

  const res = await evaluateRule(rule, mockOS);
  assert.strictEqual(res.triggered, true);
  assert.strictEqual(res.currentValue, 150);
});

await runAsyncTest('Condition 7: disallowed_country_asn filters unauthorized geos', async () => {
  const mockOS = createMockOpenSearch(() => ({
    aggregations: {
      disallowed: {
        count: { value: 25 },
        offenders: {
          buckets: [{ key: 'CN', vol: { value: 25 } }]
        }
      }
    }
  }));

  const rule = {
    id: 'r7',
    condition_type: 'disallowed_country_asn',
    threshold_value: 1,
    time_window_minutes: 60,
    domains: ['all'],
    filter_metadata: { disallowed_countries: ['CN', 'RU'] }
  };

  const res = await evaluateRule(rule, mockOS);
  assert.strictEqual(res.triggered, true);
  assert.strictEqual(res.currentValue, 25);
});

// ----------------------------------------------------
// 5. IN-PROCESS MOCK SMTP INTEGRATION TEST
// ----------------------------------------------------
console.log('\n--- 5. Mock SMTP Server & Email Queue Worker End-to-End Test ---');

await runAsyncTest('In-process SMTP server receives and validates queued email', async () => {
  // Start ephemeral SMTP server on free port
  const receivedMessages = [];
  const server = net.createServer((socket) => {
    socket.write('220 mock.sentinel.local ESMTP Mock\r\n');
    let state = '';
    let dataBuffer = '';

    socket.on('data', (data) => {
      const text = data.toString();
      if (state === 'DATA') {
        dataBuffer += text;
        if (dataBuffer.includes('\r\n.\r\n') || dataBuffer.endsWith('\r\n.\r\n') || dataBuffer.includes('\n.\n')) {
          receivedMessages.push(dataBuffer);
          dataBuffer = '';
          state = '';
          socket.write('250 OK: message queued 1001\r\n');
        }
        return;
      }

      if (text.startsWith('HELO') || text.startsWith('EHLO')) {
        socket.write('250-mock.sentinel.local\r\n250-8BITMIME\r\n250 OK\r\n');
      } else if (text.startsWith('MAIL FROM:')) {
        socket.write('250 OK\r\n');
      } else if (text.startsWith('RCPT TO:')) {
        socket.write('250 OK\r\n');
      } else if (text.startsWith('DATA')) {
        state = 'DATA';
        dataBuffer = '';
        socket.write('354 Start mail input; end with <CRLF>.<CRLF>\r\n');
      } else if (text.startsWith('QUIT')) {
        socket.write('221 Bye\r\n');
        socket.end();
      } else {
        socket.write('250 OK\r\n');
      }
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    // 1. Configure SMTP settings pointing to mock server
    db.saveSmtpSettings({
      host: '127.0.0.1',
      port: port,
      encryption: 'none',
      username: '',
      password: '',
      from_name: 'Mock Sentinel',
      from_address: 'dmarc@voxera.net',
      connection_timeout: 5000
    }, { id: 'test', username: 'test' });

    // 2. Direct send test
    const info = await sendMailDirect({
      to: 'recipient@voxera.net',
      subject: 'Automated Mock Test Subject',
      html: '<h1>Security Test</h1><p>Testing email dispatch pipeline</p>',
      text: 'Security Test - Plaintext fallback'
    });

    assert(info.messageId, 'Must return messageId');
    assert(receivedMessages.length > 0, 'Mock SMTP server must receive message');
    assert(receivedMessages[0].includes('Automated Mock Test Subject'), 'Must receive correct subject header');

    // 3. Queue worker end-to-end test
    const queueJobId = db.enqueueEmail({
      recipient: 'queued-user@voxera.net',
      subject: 'Queue Worker Verification',
      bodyHtml: '<p>Queued Email Content</p>',
      bodyText: 'Queued Email Content',
      emailType: 'alert',
      priority: 5
    });

    assert(queueJobId, 'Job must be queued with UUID');

    // Process a single queue tick
    await processQueueTick();

    // Verify delivery log exists
    const logs = db.getEmailLogs({ search: 'queued-user@voxera.net' });
    assert(logs.total >= 1, 'Email log must be recorded for queued job');
    assert.strictEqual(logs.logs[0].status, 'sent');
  } finally {
    server.close();
  }
});

// ----------------------------------------------------
// 6. AGGREGATE VIEWS TAB EXPORTER TESTS (PDF & XLSX)
// ----------------------------------------------------
console.log('\n--- 6. Aggregate Views Tab Exporter (PDF & Excel) ---');

await runAsyncTest('Export Tab to Excel (.xlsx) with styled columns and summary KPIs', async () => {
  const tmpPayload = path.join('/tmp', `test_tab_payload_${Date.now()}.json`);
  const outDir = path.resolve(__dirname, '../../reporting/output');
  const mockTab = {
    tab_id: 'per_host',
    tab_title: 'Per Host',
    domain: 'voxera.net',
    time_window: 'Last 30 Days',
    summary: { totalVolume: 1200, compliantVolume: 1100, failedVolume: 100, complianceRate: 91.7 },
    columns: [
      { key: 'ptr', label: 'Hostname', align: 'left', format: 'text' },
      { key: 'ip', label: 'IP', align: 'left', format: 'text' },
      { key: 'totalVolume', label: 'Messages', align: 'right', format: 'number' },
      { key: 'complianceRate', label: 'Compliance', align: 'center', format: 'percentage' }
    ],
    rows: [
      { ptr: 'mail.google.com', ip: '209.85.220.41', totalVolume: 1100, complianceRate: 100.0 },
      { ptr: 'unknown.host', ip: '198.51.100.1', totalVolume: 100, complianceRate: 0.0 }
    ]
  };

  await fs.promises.writeFile(tmpPayload, JSON.stringify(mockTab), 'utf8');

  try {
    const scriptPath = path.resolve(__dirname, '../../reporting/engine/tab_exporter.py');
    const { stdout } = await new Promise((resolve, reject) => {
      execFile('python3', [scriptPath, '--input', tmpPayload, '--format', 'xlsx', '--output-dir', outDir], (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve({ stdout });
      });
    });

    const res = JSON.parse(stdout.trim());
    assert.strictEqual(res.status, 'success');
    assert.strictEqual(res.format, 'xlsx');
    assert(fs.existsSync(res.path), 'Output Excel file must exist on disk');

    // Verify XLSX zip magic bytes PK
    const fd = await fs.promises.open(res.path, 'r');
    const buf = Buffer.alloc(4);
    await fd.read(buf, 0, 4, 0);
    await fd.close();
    assert.strictEqual(buf.toString('utf8', 0, 2), 'PK', 'XLSX must have valid zip header');
  } finally {
    if (fs.existsSync(tmpPayload)) await fs.promises.unlink(tmpPayload);
  }
});

await runAsyncTest('Export Tab to PDF (.pdf) with Executive Light styling and vector layout', async () => {
  const tmpPayload = path.join('/tmp', `test_tab_payload_pdf_${Date.now()}.json`);
  const outDir = path.resolve(__dirname, '../../reporting/output');
  const mockTab = {
    tab_id: 'per_org',
    tab_title: 'Per Organization',
    domain: 'voxera.net',
    time_window: 'Last 30 Days',
    summary: { totalVolume: 2500, compliantVolume: 2400, failedVolume: 100, complianceRate: 96.0 },
    columns: [
      { key: 'orgName', label: 'Reporting Organization', align: 'left', format: 'text' },
      { key: 'totalVolume', label: 'Messages', align: 'right', format: 'number' },
      { key: 'complianceRate', label: 'Compliance', align: 'center', format: 'percentage' }
    ],
    rows: [
      { orgName: 'Google LLC', totalVolume: 2400, complianceRate: 98.0 },
      { orgName: 'Yahoo! Inc', totalVolume: 100, complianceRate: 85.0 }
    ]
  };

  await fs.promises.writeFile(tmpPayload, JSON.stringify(mockTab), 'utf8');

  try {
    const scriptPath = path.resolve(__dirname, '../../reporting/engine/tab_exporter.py');
    const { stdout } = await new Promise((resolve, reject) => {
      execFile('python3', [scriptPath, '--input', tmpPayload, '--format', 'pdf', '--output-dir', outDir], (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve({ stdout });
      });
    });

    const res = JSON.parse(stdout.trim());
    assert.strictEqual(res.status, 'success');
    assert.strictEqual(res.format, 'pdf');
    assert(fs.existsSync(res.path), 'Output PDF file must exist on disk');

    // Verify PDF magic bytes %PDF
    const fd = await fs.promises.open(res.path, 'r');
    const buf = Buffer.alloc(4);
    await fd.read(buf, 0, 4, 0);
    await fd.close();
    assert.strictEqual(buf.toString('utf8'), '%PDF', 'PDF must have valid %PDF header');
  } finally {
    if (fs.existsSync(tmpPayload)) await fs.promises.unlink(tmpPayload);
  }
});

// ==========================================
// 7. Phase 1: AI Integration & Executive Summaries
// ==========================================
console.log('\n--- 7. Phase 1: AI Integration & Executive Summaries ---');

runTest('AI Settings save, retrieve, and mask API key', () => {
  const original = db.getAiSettings({ includeDecrypted: true });

  try {
    // Save new settings with real dummy key
    const saved = db.saveAiSettings({
      enabled: true,
      provider: 'google',
      model: 'gemini-1.5-flash',
      apiKey: 'AIzaSyTestKey_1234567890abcdef',
      baseUrl: '',
      temperature: 0.3,
      maxTokens: 2048,
      featureLogRca: true,
      featureExecutiveSummary: true,
      featureCopilot: true
    });

    assert.strictEqual(saved.enabled, true);
    assert.strictEqual(saved.provider, 'google');
    assert.strictEqual(saved.hasApiKey, true);
    assert.strictEqual(saved.apiKey, '••••••••', 'Public getter must mask API key');

    // Internal getter retrieves decrypted key
    const internal = db.getAiSettings({ includeDecrypted: true });
    assert.strictEqual(internal.apiKey, 'AIzaSyTestKey_1234567890abcdef', 'Internal getter retrieves decrypted key');

    // Multi-provider key switching
    db.saveAiSettings({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'sk-proj-testOpenAiKey123456'
    });

    const openaiInternal = db.getAiSettings({ includeDecrypted: true });
    assert.strictEqual(openaiInternal.provider, 'openai');
    assert.strictEqual(openaiInternal.apiKey, 'sk-proj-testOpenAiKey123456');

    // Switching back to google retains previously saved google key
    db.saveAiSettings({ provider: 'google', model: 'gemini-1.5-flash' });
    const restoredGoogle = db.getAiSettings({ includeDecrypted: true });
    assert.strictEqual(restoredGoogle.provider, 'google');
    assert.strictEqual(restoredGoogle.apiKey, 'AIzaSyTestKey_1234567890abcdef', 'Multi-provider keys preserved across switches');
  } finally {
    // Restore initial state if existed
    if (original && original.is_configured) {
      db.saveAiSettings({
        enabled: original.enabled,
        provider: original.provider,
        model: original.model,
        apiKey: original.apiKey,
        baseUrl: original.baseUrl,
        temperature: original.temperature,
        maxTokens: original.maxTokens,
        featureLogRca: original.featureLogRca,
        featureExecutiveSummary: original.featureExecutiveSummary,
        featureCopilot: original.featureCopilot
      });
    }
  }
});

await runAsyncTest('Report Generation Engine bundles Executive AI Briefing into PDF and Excel', async () => {
  const tmpSummaryFile = path.join('/tmp', `test_ai_summary_${Date.now()}.txt`);
  const outDir = path.resolve(__dirname, '../../reporting/output');
  const aiNarrative = 'Executive AI Security Briefing: Monitored domains demonstrate strong alignment with zero critical policy violations observed during the reporting period.';

  await fs.promises.writeFile(tmpSummaryFile, aiNarrative, 'utf8');

  try {
    const scriptPath = path.resolve(__dirname, '../../reporting/report_service.py');
    const { stdout } = await new Promise((resolve, reject) => {
      execFile('python3', [
        scriptPath,
        '--domain', 'voxera.net',
        '--formats', 'pdf,xlsx',
        '--output-dir', outDir,
        '--ai-summary-file', tmpSummaryFile
      ], (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve({ stdout });
      });
    });

    const res = JSON.parse(stdout.trim());
    assert.strictEqual(res.status, 'success');
    assert(res.files.pdf && fs.existsSync(res.files.pdf.path), 'PDF report must be generated');
    assert(res.files.xlsx && fs.existsSync(res.files.xlsx.path), 'Excel report must be generated');

    // Clean up generated report files
    if (fs.existsSync(res.files.pdf.path)) await fs.promises.unlink(res.files.pdf.path);
    if (fs.existsSync(res.files.xlsx.path)) await fs.promises.unlink(res.files.xlsx.path);
  } finally {
    if (fs.existsSync(tmpSummaryFile)) await fs.promises.unlink(tmpSummaryFile);
  }
});

// ==========================================
// 8. Phase 2: AI Copilot & Shadow IT Discovery
// ==========================================

runTest('AI Copilot database sessions and multi-turn message history lifecycle', () => {
  const session = db.createCopilotSession({
    userId: 1,
    domainScope: 'voxera.net',
    title: 'Investigate SPF drops'
  });

  assert(session && session.id, 'Session should be created with UUID');
  assert.strictEqual(session.domain_scope, 'voxera.net');
  assert.strictEqual(session.title, 'Investigate SPF drops');

  // Add user message
  const userMsg = db.addCopilotMessage({
    sessionId: session.id,
    role: 'user',
    content: 'Why did delivery fail on marketing mail?'
  });
  assert(userMsg && userMsg.id, 'User message should be persisted');

  // Add assistant message with suggestions and metadata
  const assistantMsg = db.addCopilotMessage({
    sessionId: session.id,
    role: 'assistant',
    content: 'Marketing mail from SendGrid failed SPF alignment.',
    meta: {
      model: 'gemini-1.5-flash',
      provider: 'google',
      latencyMs: 340,
      suggestions: ['Show SendGrid IPs', 'Provide SPF include for SendGrid']
    }
  });
  assert(assistantMsg && assistantMsg.id, 'Assistant message should be persisted');
  assert.deepStrictEqual(assistantMsg.meta.suggestions, ['Show SendGrid IPs', 'Provide SPF include for SendGrid']);

  // Retrieve message history
  const history = db.getCopilotMessages(session.id);
  assert.strictEqual(history.length, 2, 'Session should contain exactly 2 messages');
  assert.strictEqual(history[0].role, 'user');
  assert.strictEqual(history[1].role, 'assistant');

  // Update session title
  db.updateCopilotSessionTitle(session.id, 1, 'SendGrid SPF Investigation');
  const sessions = db.listCopilotSessions(1);
  const found = sessions.find(s => s.id === session.id);
  assert.strictEqual(found.title, 'SendGrid SPF Investigation');

  // Cleanup: delete session
  const deleted = db.deleteCopilotSession(session.id, 1);
  assert.strictEqual(deleted.success, true, 'Session should be deleted');
  const remainingHistory = db.getCopilotMessages(session.id);
  assert.strictEqual(remainingHistory.length, 0, 'Messages should cascade delete');
});

runTest('SaaS Vendor Pattern Matcher correctly identifies major email providers', () => {
  assert(KNOWN_SAAS_VENDORS.length >= 10, 'SaaS vendor catalog must contain at least 10 vendors');

  // Google Workspace match
  const googleMatch = matchSaaSymmetricVendor({
    sourceName: 'Google Workspace Relay',
    baseDomain: 'google.com',
    asName: 'AS15169 GOOGLE',
    nestedHosts: [{ hostname: 'mail-wr1-x42a.google.com', ip: '209.85.128.42' }]
  });
  assert(googleMatch && googleMatch.id === 'google', 'Should match Google Workspace');
  assert.strictEqual(googleMatch.spfInclude, 'include:_spf.google.com');

  // SendGrid match
  const sendgridMatch = matchSaaSymmetricVendor({
    sourceName: 'SendGrid Cloud MTA',
    baseDomain: 'sendgrid.net',
    asName: 'AS11377 TWILIO-SENDGRID',
    nestedHosts: [{ hostname: 'o1.ptr2918.sendgrid.net', ip: '167.89.20.1' }]
  });
  assert(sendgridMatch && sendgridMatch.id === 'sendgrid', 'Should match Twilio SendGrid');
  assert.strictEqual(sendgridMatch.spfInclude, 'include:sendgrid.net');

  // Salesforce match
  const salesforceMatch = matchSaaSymmetricVendor({
    sourceName: 'Salesforce Marketing Cloud',
    baseDomain: 'salesforce.com',
    asName: 'AS14340 EXACTTARGET',
    nestedHosts: [{ hostname: 'mta.exacttarget.com', ip: '136.147.180.1' }]
  });
  assert(salesforceMatch && salesforceMatch.id === 'salesforce', 'Should match Salesforce');

  // Unknown relay
  const unknownMatch = matchSaaSymmetricVendor({
    sourceName: 'Random Unregistered VPS',
    baseDomain: 'unknownvps.xyz',
    asName: 'AS99999 HOSTING-CO',
    nestedHosts: [{ hostname: 'host99.unknownvps.xyz', ip: '185.220.101.5' }]
  });
  assert.strictEqual(unknownMatch, null, 'Unregistered VPS should not match known SaaS catalog');
});

await runAsyncTest('Shadow IT Analysis classifies sources into Authorized SaaS, Shadow IT, and Rogue Spoofers', async () => {
  const mockSources = [
    {
      sourceName: 'Google Workspace',
      baseDomain: 'google.com',
      asName: 'GOOGLE',
      totalVolume: 5000,
      compliantVolume: 4980, // 99.6% pass -> Authorized SaaS
      spfAlignedVolume: 4980,
      dkimAlignedVolume: 4980,
      nestedHosts: [{ ip: '209.85.128.42', hostname: 'mail.google.com' }]
    },
    {
      sourceName: 'HubSpot Inbound Marketing',
      baseDomain: 'hubspot.com',
      asName: 'HUBSPOT',
      totalVolume: 1200,
      compliantVolume: 100, // 8.3% pass -> Shadow IT (Needs DNS Auth)
      spfAlignedVolume: 0,
      dkimAlignedVolume: 100,
      nestedHosts: [{ ip: '158.247.18.5', hostname: 'bid.hubspot.com' }]
    },
    {
      sourceName: 'Botnet Spoofing Relay',
      baseDomain: 'badactor.cc',
      asName: 'BULK-HOSTING',
      totalVolume: 450,
      compliantVolume: 0, // 0% pass, not SaaS -> Rogue Spoofer
      spfAlignedVolume: 0,
      dkimAlignedVolume: 0,
      nestedHosts: [{ ip: '91.240.118.2', hostname: 'scanner.badactor.cc' }]
    }
  ];

  const analysis = await analyzeShadowItAndVendors({ sources: mockSources, domainScope: 'voxera.net' });

  assert.strictEqual(analysis.summary.totalSources, 3);
  assert.strictEqual(analysis.summary.authorizedCount, 1);
  assert.strictEqual(analysis.summary.shadowItCount, 1);
  assert.strictEqual(analysis.summary.rogueCount, 1);
  assert.strictEqual(analysis.summary.shadowItVolume, 1200);
  assert.strictEqual(analysis.summary.atRiskVolume, 1100 + 450);

  const hubspot = analysis.vendors.find(v => v.id === 'hubspot');
  assert(hubspot, 'HubSpot vendor should be in analysis results');
  assert.strictEqual(hubspot.classification, 'shadow_it');
  assert.strictEqual(hubspot.riskLevel, 'high');
  assert(hubspot.spfInclude.includes('hubspot.com'), 'Should provide HubSpot SPF include');
  assert(hubspot.remediationAction.includes('Add'), 'Should suggest DNS remediation');

  const google = analysis.vendors.find(v => v.id === 'google');
  assert(google, 'Google vendor should be in analysis results');
  assert.strictEqual(google.classification, 'authorized_saas');

  const rogue = analysis.vendors.find(v => v.classification === 'malicious_spoof');
  assert(rogue, 'Rogue spoofer should be identified');
});

// ----------------------------------------------------
// 8. PHASE 3: DEEP SECURITY TESTS
// ----------------------------------------------------

await runAsyncTest('AI Policy Enforcement Simulator accurately models delivery disruption and confidence score', async () => {
  const mockTelemetry = {
    totalMessages: 6650,
    passedMessages: 5080,
    failedMessages: 1570,
    sources: [
      {
        sourceName: 'Google Workspace Relay',
        baseDomain: 'google.com',
        asName: 'GOOGLE',
        totalVolume: 5000,
        compliantVolume: 4980,
        nestedHosts: [{ hostname: 'mail.google.com', ip: '209.85.128.42' }]
      },
      {
        sourceName: 'HubSpot Marketing',
        baseDomain: 'hubspot.com',
        asName: 'HUBSPOT',
        totalVolume: 1200,
        compliantVolume: 100, // 8.3% pass rate (< 95%) -> At-Risk Legitimate Sender
        nestedHosts: [{ hostname: 'bid.hubspot.com', ip: '158.247.18.5' }]
      },
      {
        sourceName: 'Unauthorized Bulk Host',
        baseDomain: 'spammer.biz',
        asName: 'ROGUE-HOST',
        totalVolume: 450,
        compliantVolume: 0, // 0% compliance -> Neutralized Threat
        nestedHosts: [{ hostname: 'mail.spammer.biz', ip: '185.220.101.5' }]
      }
    ]
  };

  const simResult = await simulatePolicyEnforcement({
    domainScope: 'voxera.net',
    targetPolicy: 'reject',
    targetPct: 100,
    telemetryData: mockTelemetry
  });

  assert.strictEqual(simResult.status, 'success');
  assert.strictEqual(simResult.targetPolicy, 'reject');
  assert.strictEqual(simResult.targetPct, 100);

  const { simulation } = simResult;
  assert.strictEqual(simulation.totalVolume, 6650);
  assert.strictEqual(simulation.safeVolume, 5080);
  assert.strictEqual(simulation.safePercentage, 76.4);
  assert.strictEqual(simulation.atRiskLegitimateVolume, 1100);
  assert.strictEqual(simulation.projectedBlockedDisruption, 1100);
  assert.strictEqual(simulation.neutralizedThreatVolume, 450);
  assert.strictEqual(simulation.projectedNeutralizedSpoofs, 450);

  // At-risk vendor identification
  assert.strictEqual(simulation.atRiskVendors.length, 1);
  assert.strictEqual(simulation.atRiskVendors[0].id, 'hubspot');
  assert.strictEqual(simulation.atRiskVendors[0].atRiskVolume, 1100);
  assert(simulation.atRiskVendors[0].recommendedFix.includes('include:_spf.hubspot.com'));

  // Readiness confidence score deduction
  assert(simulation.readinessScore < 75, 'Confidence score should be penalized for high at-risk legitimate volume');
  assert.strictEqual(simulation.readinessStatus, 'high_risk');

  // Staged rollout checklist verification
  assert.strictEqual(simulation.stagedChecklist.length, 5);
  assert.strictEqual(simulation.stagedChecklist[0].status, 'completed');
  assert.strictEqual(simulation.stagedChecklist[1].status, 'pending');

  // Target DMARC DNS record formatting
  assert(simulation.targetDmarcRecord.startsWith('v=DMARC1; p=reject; sp=reject; pct=100;'));
  assert(simulation.targetDmarcRecord.includes('mailto:dmarc-rua@voxera.net'));
});

await runAsyncTest('Predictive Anomaly Detection identifies vendor drops, geo spikes, and nominal baseline', async () => {
  // Scenario A: Anomalous telemetry with vendor drop, geo origin spike, and stealth campaign
  const anomalousTelemetry = {
    totalMessages: 5000,
    sources: [
      {
        sourceName: 'Zendesk Support',
        baseDomain: 'zendesk.com',
        asName: 'ZENDESK',
        totalVolume: 800,
        compliantVolume: 200, // 25% pass (< 90%) -> vendor_alignment_drop anomaly
        nestedHosts: [{ hostname: 'mail.zendesk.com', ip: '192.161.148.5' }]
      },
      {
        sourceName: 'Foreign Relay Cluster',
        baseDomain: 'foreignrelay.ru',
        asName: 'RU-HOST',
        totalVolume: 50,
        compliantVolume: 0,
        nestedHosts: [
          { hostname: 'node-ru.foreignrelay.ru', ip: '91.240.118.2', country: 'RU', volume: 50 }
        ]
      },
      {
        sourceName: 'Distributed Botnet',
        baseDomain: 'botcluster.org',
        asName: 'BULK',
        totalVolume: 120,
        compliantVolume: 5,
        nestedHosts: [{ hostname: 'sp1.botcluster.org', ip: '45.154.255.8', country: 'US', volume: 120 }]
      }
    ]
  };

  const anomReport = await detectPredictiveAnomalies({
    domainScope: 'voxera.net',
    telemetryData: anomalousTelemetry
  });

  assert.strictEqual(anomReport.status, 'success');
  assert(anomReport.totalAnomalies >= 3, 'Should detect at least 3 distinct non-low anomalies');

  const vendorDrop = anomReport.anomalies.find(a => a.type === 'vendor_alignment_drop');
  assert(vendorDrop, 'Should detect vendor alignment drop anomaly');
  assert.strictEqual(vendorDrop.sender, 'Zendesk Support');
  assert.strictEqual(vendorDrop.severity, 'high');

  const geoSpike = anomReport.anomalies.find(a => a.type === 'geographic_origin_anomaly');
  assert(geoSpike, 'Should detect geographic origin spike anomaly');
  assert.strictEqual(geoSpike.severity, 'critical');
  assert(geoSpike.description.includes('RU'));

  const stealthPhish = anomReport.anomalies.find(a => a.type === 'stealth_spoof_campaign');
  assert(stealthPhish, 'Should detect stealth spoof campaign');

  // Scenario B: Clean telemetry produces nominal baseline
  const cleanTelemetry = {
    totalMessages: 1000,
    sources: [
      {
        sourceName: 'Google Workspace',
        baseDomain: 'google.com',
        asName: 'GOOGLE',
        totalVolume: 1000,
        compliantVolume: 998,
        nestedHosts: [{ hostname: 'mail.google.com', ip: '209.85.128.42', country: 'US', volume: 1000 }]
      }
    ]
  };

  const cleanReport = await detectPredictiveAnomalies({
    domainScope: 'voxera.net',
    telemetryData: cleanTelemetry
  });

  assert.strictEqual(cleanReport.totalAnomalies, 0);
  assert.strictEqual(cleanReport.anomalies[0].type, 'nominal_baseline');
  assert.strictEqual(cleanReport.anomalies[0].severity, 'low');
});

runTest('SPF & BIMI Smart Optimizer evaluates RFC 7208 10-lookup limits and BIMI SVG readiness', () => {
  // Test Case 1: Healthy record with 3 lookups
  const safeSpf = 'v=spf1 include:_spf.google.com include:sendgrid.net a:mail.voxera.net ~all';
  const safeResult = optimizeSpfAndBimi({ domain: 'voxera.net', currentSpf: safeSpf, logoUrl: 'https://voxera.net/logo.svg' });

  assert.strictEqual(safeResult.spfOptimizer.lookupCount, 3);
  assert.strictEqual(safeResult.spfOptimizer.lookupsRemaining, 7);
  assert.strictEqual(safeResult.spfOptimizer.status, 'safe');
  assert.strictEqual(safeResult.bimiOptimizer.selector, 'default._bimi.voxera.net');
  assert.strictEqual(safeResult.bimiOptimizer.svgTinyCompliant, true);
  assert(safeResult.bimiOptimizer.bimiRecord.includes('v=BIMI1;'));

  // Test Case 2: Near limit record with 8 lookups
  const nearLimitSpf = 'v=spf1 include:one.com include:two.com include:three.com include:four.com include:five.com include:six.com a mx ~all';
  const warnResult = optimizeSpfAndBimi({ domain: 'voxera.net', currentSpf: nearLimitSpf });
  assert.strictEqual(warnResult.spfOptimizer.lookupCount, 8);
  assert.strictEqual(warnResult.spfOptimizer.status, 'warning');

  // Test Case 3: Exceeded limit (PermError) with 11 lookups
  const exceededSpf = 'v=spf1 include:1.com include:2.com include:3.com include:4.com include:5.com include:6.com include:7.com include:8.com include:9.com include:10.com include:11.com ~all';
  const dangerResult = optimizeSpfAndBimi({ domain: 'voxera.net', currentSpf: exceededSpf });
  assert.strictEqual(dangerResult.spfOptimizer.lookupCount, 11);
  assert.strictEqual(dangerResult.spfOptimizer.status, 'danger');
  assert(dangerResult.spfOptimizer.recommendation.includes('RFC 7208 PermError Alert'));
});

console.log('\n====================================================');
console.log(`🎯 Test Summary: ${testsPassed} Passed, ${testsFailed} Failed.`);
console.log('====================================================\n');

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
