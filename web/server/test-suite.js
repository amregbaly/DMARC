import assert from 'node:assert';
import net from 'node:net';
import crypto from 'node:crypto';
import db from './db.js';
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
  parts[2] = parts[2].slice(0, -2) + 'aa';
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

console.log('\n====================================================');
console.log(`🎯 Test Summary: ${testsPassed} Passed, ${testsFailed} Failed.`);
console.log('====================================================\n');

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
