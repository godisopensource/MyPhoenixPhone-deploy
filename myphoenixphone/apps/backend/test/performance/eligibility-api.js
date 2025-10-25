/**
 * k6 Performance Test: Eligibility API
 * 
 * Target: 100 req/s for 60 seconds
 * Success Criteria: p95 < 500ms, error rate < 1%
 * 
 * Run: k6 run eligibility-api.js
 * With custom thresholds: k6 run --vus 20 --duration 120s eligibility-api.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const eligibilityDuration = new Trend('eligibility_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 VUs
    { duration: '60s', target: 100 },  // Ramp up to 100 VUs (100 req/s)
    { duration: '60s', target: 100 },  // Stay at 100 VUs for 60s
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                   // Error rate < 1%
    errors: ['rate<0.01'],                            // Custom error rate < 1%
    eligibility_duration: ['p(95)<500'],              // Eligibility check < 500ms
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key-12345';

// Test data: realistic French phone numbers
const PHONE_NUMBERS = [
  '+33699901001', '+33699901002', '+33699901003', '+33699901004', '+33699901005',
  '+33699901006', '+33699901007', '+33699901008', '+33699901009', '+33699901010',
  '+33699901011', '+33699901012', '+33699901013', '+33699901014', '+33699901015',
  '+33699901016', '+33699901017', '+33699901018', '+33699901019', '+33699901020',
];

export default function () {
  // Select random phone number
  const phoneNumber = PHONE_NUMBERS[Math.floor(Math.random() * PHONE_NUMBERS.length)];
  
  const url = `${BASE_URL}/api/eligibility/check`;
  const payload = JSON.stringify({
    phoneNumber: phoneNumber,
    includeDetails: true,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    tags: { name: 'EligibilityCheck' },
  };

  // Make request
  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const duration = Date.now() - startTime;

  // Record custom metrics
  eligibilityDuration.add(duration);
  errorRate.add(response.status !== 200);

  // Validate response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response has eligible field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('eligible');
      } catch {
        return false;
      }
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response has phoneNumber': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('phoneNumber');
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    console.log(`Request failed for ${phoneNumber}: ${response.status}`);
  }

  // Realistic user think time
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

export function handleSummary(data) {
  return {
    'performance/results/eligibility-api-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}Performance Test Summary: Eligibility API\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;

  // HTTP metrics
  const httpReqDuration = data.metrics.http_req_duration;
  if (httpReqDuration) {
    summary += `${indent}HTTP Request Duration:\n`;
    summary += `${indent}  - p50: ${httpReqDuration.values['p(50)'].toFixed(2)}ms\n`;
    summary += `${indent}  - p95: ${httpReqDuration.values['p(95)'].toFixed(2)}ms (target: <500ms)\n`;
    summary += `${indent}  - p99: ${httpReqDuration.values['p(99)'].toFixed(2)}ms (target: <1000ms)\n`;
    summary += `${indent}  - avg: ${httpReqDuration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  - max: ${httpReqDuration.values.max.toFixed(2)}ms\n\n`;
  }

  // Request rate
  const httpReqs = data.metrics.http_reqs;
  if (httpReqs) {
    summary += `${indent}Request Rate:\n`;
    summary += `${indent}  - total: ${httpReqs.values.count} requests\n`;
    summary += `${indent}  - rate: ${httpReqs.values.rate.toFixed(2)} req/s\n\n`;
  }

  // Error rate
  const httpReqFailed = data.metrics.http_req_failed;
  if (httpReqFailed) {
    const errorPct = (httpReqFailed.values.rate * 100).toFixed(2);
    summary += `${indent}Error Rate:\n`;
    summary += `${indent}  - failed: ${httpReqFailed.values.passes} requests\n`;
    summary += `${indent}  - rate: ${errorPct}% (target: <1%)\n\n`;
  }

  // VU statistics
  summary += `${indent}Virtual Users:\n`;
  summary += `${indent}  - max: ${data.metrics.vus_max.values.max}\n`;
  summary += `${indent}  - avg: ${data.metrics.vus.values.value.toFixed(0)}\n\n`;

  // Threshold results
  summary += `${indent}Thresholds:\n`;
  const thresholds = data.thresholds || {};
  for (const [name, threshold] of Object.entries(thresholds)) {
    const passed = Object.values(threshold).every(t => t.ok);
    const status = passed ? '✓ PASS' : '✗ FAIL';
    summary += `${indent}  ${status} - ${name}\n`;
  }

  return summary;
}
