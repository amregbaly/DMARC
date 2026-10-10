import 'dotenv/config';
import { spawn } from 'node:child_process';
import http from 'node:http';

async function runTests() {
  console.log('🚀 Starting test server instance...');
  const serverProc = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '5055' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProc.stdout.on('data', (d) => console.log('[Server stdout]:', d.toString().trim()));
  serverProc.stderr.on('data', (d) => console.log('[Server stderr]:', d.toString().trim()));

  // Wait for server to listen
  await new Promise(resolve => setTimeout(resolve, 2000));

  const BASE = 'http://127.0.0.1:5055';
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Helmet security headers
    console.log('\n--- Test 1: Helmet Security Headers ---');
    const healthRes = await fetch(`${BASE}/api/health`, {
      headers: { Origin: 'http://localhost:3000' }
    });
    assert(healthRes.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options is nosniff');
    assert(healthRes.headers.get('x-frame-options') === 'SAMEORIGIN', 'X-Frame-Options is configured');
    assert(healthRes.headers.get('access-control-allow-origin') === 'http://localhost:3000', 'CORS origin reflects authorized origin');

    // Test 2: CORS blocking unauthorized origin
    console.log('\n--- Test 2: CORS Origin Restriction ---');
    const corsRes = await fetch(`${BASE}/api/health`, {
      headers: { Origin: 'http://evil-attacker.com' }
    });
    assert(corsRes.status === 403, 'Unauthorized origin is rejected with HTTP 403');

    // Test 3: Login authentication and rate limiting
    console.log('\n--- Test 3: Login Endpoint & Brute-Force Rate Limiting ---');
    const badLogin = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      body: JSON.stringify({ email: 'admin@dmarcsentinel.local', password: 'wrongpassword' })
    });
    const badLoginJson = await badLogin.json();
    assert(badLogin.status === 401 && badLoginJson.error === 'Invalid email or password', 'Bad login returns generic 401');

    console.log('Sending rapid login requests to trigger rate limit...');
    let rateLimited = false;
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
        body: JSON.stringify({ email: 'admin@dmarcsentinel.local', password: 'wrongpassword' })
      });
      if (res.status === 429) {
        rateLimited = true;
        break;
      }
    }
    assert(rateLimited, 'Rate limiter triggers HTTP 429 Too Many Requests after threshold');

    // Test 4: SSRF input validation in domain-health
    console.log('\n--- Test 4: SSRF & FQDN Validation in Domain Health ---');
    // First login as admin to get auth token
    const validLogin = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      body: JSON.stringify({ email: 'amr@voxera.net', password: 'password123' })
    });
    const { generateToken } = await import('./auth.js');
    const db = (await import('./db.js')).default;
    const adminUser = db.getUserByUsername('admin');
    const testAdminToken = generateToken(adminUser);

    const ssrfPayload1 = await fetch(`${BASE}/api/domain-health?domain=127.0.0.1:9200`, {
      headers: { Authorization: `Bearer ${testAdminToken}`, Origin: 'http://localhost:3000' }
    });
    assert(ssrfPayload1.status === 400, 'Port injection & IP in domain rejected with HTTP 400');

    const ssrfPayload2 = await fetch(`${BASE}/api/domain-health?domain=http://169.254.169.254/latest`, {
      headers: { Authorization: `Bearer ${testAdminToken}`, Origin: 'http://localhost:3000' }
    });
    assert(ssrfPayload2.status === 400, 'URL & metadata payload rejected with HTTP 400');

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

  } finally {
    serverProc.kill();
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
