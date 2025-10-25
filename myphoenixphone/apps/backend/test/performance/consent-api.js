/**
 * k6 Performance Test: Consent API (OAuth2 Flow)
 * 
 * Target: 50 req/s for 60 seconds
 * Success Criteria: p95 < 1000ms (OAuth flow is heavier), error rate < 2%
 * 
 * Run: k6 run consent-api.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const consentInitDuration = new Trend('consent_init_duration');
const consentCallbackDuration = new Trend('consent_callback_duration');
const totalConsents = new Counter('total_consents');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 VUs
    { duration: '60s', target: 50 },   // Ramp up to 50 VUs (50 req/s)
    { duration: '60s', target: 50 },   // Stay at 50 VUs
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.02'],  // Allow 2% error rate (OAuth is flaky)
    errors: ['rate<0.02'],
    consent_init_duration: ['p(95)<800'],
    consent_callback_duration: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key-12345';

const PHONE_NUMBERS = [
  '+33699901101', '+33699901102', '+33699901103', '+33699901104', '+33699901105',
  '+33699901106', '+33699901107', '+33699901108', '+33699901109', '+33699901110',
];

const SCOPES = ['network:location', 'network:sim-swap', 'network:reachability'];

export default function () {
  const phoneNumber = PHONE_NUMBERS[Math.floor(Math.random() * PHONE_NUMBERS.length)];
  
  // Step 1: Initialize consent request
  const initUrl = `${BASE_URL}/api/consent/init`;
  const initPayload = JSON.stringify({
    phoneNumber: phoneNumber,
    scopes: SCOPES,
    redirectUri: 'https://example.com/callback',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
  };

  const initStart = Date.now();
  const initResponse = http.post(initUrl, initPayload, params);
  consentInitDuration.add(Date.now() - initStart);

  const initSuccess = check(initResponse, {
    'init status is 200': (r) => r.status === 200,
    'init has authUrl': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('authUrl');
      } catch {
        return false;
      }
    },
    'init has consentId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('consentId');
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!initSuccess);

  if (!initSuccess) {
    console.log(`Consent init failed: ${initResponse.status}`);
    sleep(1);
    return;
  }

  let consentId;
  try {
    const body = JSON.parse(initResponse.body);
    consentId = body.consentId;
  } catch {
    console.log('Failed to parse consent response');
    sleep(1);
    return;
  }

  // Simulate user OAuth flow delay (redirects, user interaction)
  sleep(Math.random() * 1 + 0.5); // 0.5-1.5 seconds

  // Step 2: Simulate OAuth callback (in real flow, this comes from OAuth provider)
  const callbackUrl = `${BASE_URL}/api/consent/callback`;
  const callbackPayload = JSON.stringify({
    consentId: consentId,
    authorizationCode: `mock_code_${Date.now()}`,
    state: consentId,
  });

  const callbackStart = Date.now();
  const callbackResponse = http.post(callbackUrl, callbackPayload, params);
  consentCallbackDuration.add(Date.now() - callbackStart);

  const callbackSuccess = check(callbackResponse, {
    'callback status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'callback has success indicator': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true || body.status === 'granted';
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!callbackSuccess);

  if (callbackSuccess) {
    totalConsents.add(1);
  } else {
    console.log(`Consent callback failed: ${callbackResponse.status}`);
  }

  // Think time between consent flows
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

export function handleSummary(data) {
  return {
    'performance/results/consent-api-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  let summary = '\n';
  summary += 'Performance Test Summary: Consent API (OAuth Flow)\n';
  summary += '='.repeat(50) + '\n\n';

  // HTTP metrics
  const httpReqDuration = data.metrics.http_req_duration;
  if (httpReqDuration) {
    summary += 'HTTP Request Duration:\n';
    summary += `  - p50: ${httpReqDuration.values['p(50)'].toFixed(2)}ms\n`;
    summary += `  - p95: ${httpReqDuration.values['p(95)'].toFixed(2)}ms (target: <1000ms)\n`;
    summary += `  - p99: ${httpReqDuration.values['p(99)'].toFixed(2)}ms (target: <2000ms)\n`;
    summary += `  - avg: ${httpReqDuration.values.avg.toFixed(2)}ms\n\n`;
  }

  // Consent-specific metrics
  const initDuration = data.metrics.consent_init_duration;
  const callbackDuration = data.metrics.consent_callback_duration;
  
  if (initDuration) {
    summary += 'Consent Init Duration:\n';
    summary += `  - p50: ${initDuration.values['p(50)'].toFixed(2)}ms\n`;
    summary += `  - p95: ${initDuration.values['p(95)'].toFixed(2)}ms (target: <800ms)\n`;
    summary += `  - avg: ${initDuration.values.avg.toFixed(2)}ms\n\n`;
  }

  if (callbackDuration) {
    summary += 'Consent Callback Duration:\n';
    summary += `  - p50: ${callbackDuration.values['p(50)'].toFixed(2)}ms\n`;
    summary += `  - p95: ${callbackDuration.values['p(95)'].toFixed(2)}ms (target: <1000ms)\n`;
    summary += `  - avg: ${callbackDuration.values.avg.toFixed(2)}ms\n\n`;
  }

  // Request stats
  const httpReqs = data.metrics.http_reqs;
  const totalConsentsMetric = data.metrics.total_consents;
  
  if (httpReqs && totalConsentsMetric) {
    summary += 'Request Statistics:\n';
    summary += `  - total requests: ${httpReqs.values.count}\n`;
    summary += `  - request rate: ${httpReqs.values.rate.toFixed(2)} req/s\n`;
    summary += `  - successful consents: ${totalConsentsMetric.values.count}\n`;
    summary += `  - consent rate: ${totalConsentsMetric.values.rate.toFixed(2)} consents/s\n\n`;
  }

  // Error rate
  const httpReqFailed = data.metrics.http_req_failed;
  if (httpReqFailed) {
    const errorPct = (httpReqFailed.values.rate * 100).toFixed(2);
    summary += 'Error Rate:\n';
    summary += `  - failed: ${httpReqFailed.values.passes} requests\n`;
    summary += `  - rate: ${errorPct}% (target: <2%)\n\n`;
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
