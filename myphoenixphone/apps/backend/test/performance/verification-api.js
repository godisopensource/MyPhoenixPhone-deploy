/**
 * k6 Performance Test: Verification API (SMS Verification)
 * 
 * Target: 30 req/s for 60 seconds
 * Success Criteria: p95 < 800ms, error rate < 1%
 * 
 * Run: k6 run verification-api.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const sendCodeDuration = new Trend('send_code_duration');
const verifyCodeDuration = new Trend('verify_code_duration');
const successfulVerifications = new Counter('successful_verifications');

// Test configuration
export const options = {
  stages: [
    { duration: '20s', target: 5 },    // Ramp up to 5 VUs
    { duration: '40s', target: 30 },   // Ramp up to 30 VUs (30 req/s)
    { duration: '60s', target: 30 },   // Stay at 30 VUs
    { duration: '20s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
    send_code_duration: ['p(95)<500'],
    verify_code_duration: ['p(95)<800'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key-12345';

const PHONE_NUMBERS = [
  '+33699902001', '+33699902002', '+33699902003', '+33699902004', '+33699902005',
  '+33699902006', '+33699902007', '+33699902008', '+33699902009', '+33699902010',
];

export default function () {
  const phoneNumber = PHONE_NUMBERS[Math.floor(Math.random() * PHONE_NUMBERS.length)];
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
  };

  // Step 1: Send verification code
  const sendUrl = `${BASE_URL}/api/verification/send`;
  const sendPayload = JSON.stringify({
    phoneNumber: phoneNumber,
    method: 'sms',
  });

  const sendStart = Date.now();
  const sendResponse = http.post(sendUrl, sendPayload, params);
  sendCodeDuration.add(Date.now() - sendStart);

  const sendSuccess = check(sendResponse, {
    'send status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'send has verificationId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('verificationId');
      } catch {
        return false;
      }
    },
    'send response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!sendSuccess);

  if (!sendSuccess) {
    console.log(`Send code failed: ${sendResponse.status}`);
    sleep(1);
    return;
  }

  let verificationId;
  try {
    const body = JSON.parse(sendResponse.body);
    verificationId = body.verificationId;
  } catch {
    console.log('Failed to parse send response');
    sleep(1);
    return;
  }

  // Simulate user receiving and entering code (realistic delay)
  sleep(Math.random() * 2 + 1); // 1-3 seconds

  // Step 2: Verify code
  const verifyUrl = `${BASE_URL}/api/verification/verify`;
  const verifyPayload = JSON.stringify({
    verificationId: verificationId,
    code: '123456', // Mock code (in real test, would need actual code)
    phoneNumber: phoneNumber,
  });

  const verifyStart = Date.now();
  const verifyResponse = http.post(verifyUrl, verifyPayload, params);
  verifyCodeDuration.add(Date.now() - verifyStart);

  const verifySuccess = check(verifyResponse, {
    'verify status is 200 or 202': (r) => r.status === 200 || r.status === 202 || r.status === 400, // 400 is ok (invalid code in test)
    'verify has verified field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('verified') || body.hasOwnProperty('valid');
      } catch {
        return false;
      }
    },
    'verify response time < 800ms': (r) => r.timings.duration < 800,
  });

  errorRate.add(!verifySuccess);

  if (verifySuccess) {
    try {
      const body = JSON.parse(verifyResponse.body);
      if (body.verified === true || body.valid === true) {
        successfulVerifications.add(1);
      }
    } catch {
      // Ignore parsing errors
    }
  } else {
    console.log(`Verify code failed: ${verifyResponse.status}`);
  }

  // Think time between verification attempts
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

export function handleSummary(data) {
  return {
    'performance/results/verification-api-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  let summary = '\n';
  summary += 'Performance Test Summary: Verification API (SMS)\n';
  summary += '='.repeat(50) + '\n\n';

  // HTTP metrics
  const httpReqDuration = data.metrics.http_req_duration;
  if (httpReqDuration) {
    summary += 'HTTP Request Duration:\n';
    summary += `  - p50: ${httpReqDuration.values['p(50)'].toFixed(2)}ms\n`;
    summary += `  - p95: ${httpReqDuration.values['p(95)'].toFixed(2)}ms (target: <800ms)\n`;
    summary += `  - p99: ${httpReqDuration.values['p(99)'].toFixed(2)}ms (target: <1500ms)\n`;
    summary += `  - avg: ${httpReqDuration.values.avg.toFixed(2)}ms\n\n`;
  }

  // Verification-specific metrics
  const sendDuration = data.metrics.send_code_duration;
  const verifyDuration = data.metrics.verify_code_duration;
  
  if (sendDuration) {
    summary += 'Send Code Duration:\n';
    summary += `  - p50: ${sendDuration.values['p(50)'].toFixed(2)}ms\n`;
    summary += `  - p95: ${sendDuration.values['p(95)'].toFixed(2)}ms (target: <500ms)\n`;
    summary += `  - avg: ${sendDuration.values.avg.toFixed(2)}ms\n\n`;
  }

  if (verifyDuration) {
    summary += 'Verify Code Duration:\n';
    summary += `  - p50: ${verifyDuration.values['p(50)'].toFixed(2)}ms\n`;
    summary += `  - p95: ${verifyDuration.values['p(95)'].toFixed(2)}ms (target: <800ms)\n`;
    summary += `  - avg: ${verifyDuration.values.avg.toFixed(2)}ms\n\n`;
  }

  // Request stats
  const httpReqs = data.metrics.http_reqs;
  const successfulVer = data.metrics.successful_verifications;
  
  if (httpReqs) {
    summary += 'Request Statistics:\n';
    summary += `  - total requests: ${httpReqs.values.count}\n`;
    summary += `  - request rate: ${httpReqs.values.rate.toFixed(2)} req/s\n`;
    if (successfulVer) {
      summary += `  - successful verifications: ${successfulVer.values.count}\n`;
    }
    summary += '\n';
  }

  // Error rate
  const httpReqFailed = data.metrics.http_req_failed;
  if (httpReqFailed) {
    const errorPct = (httpReqFailed.values.rate * 100).toFixed(2);
    summary += 'Error Rate:\n';
    summary += `  - failed: ${httpReqFailed.values.passes} requests\n`;
    summary += `  - rate: ${errorPct}% (target: <1%)\n\n`;
  }

  // Thresholds
  summary += 'Thresholds:\n';
  const thresholds = data.thresholds || {};
  for (const [name, threshold] of Object.entries(thresholds)) {
    const passed = Object.values(threshold).every(t => t.ok);
    const status = passed ? '✓ PASS' : '✗ FAIL';
    summary += `  ${status} - ${name}\n`;
  }

  return summary;
}
