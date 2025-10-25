/**
 * k6 Performance Test: Workers API (Daily Refresh Worker)
 * 
 * Target: Benchmark worker execution for 500 leads/run
 * Success Criteria: Complete processing in < 60 seconds, error rate < 0.5%
 * 
 * Run: k6 run workers-benchmark.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const workerExecutionDuration = new Trend('worker_execution_duration');
const leadsProcessed = new Counter('leads_processed');
const workerStatusChecks = new Counter('worker_status_checks');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Trigger worker execution
    trigger_workers: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
      exec: 'triggerWorkers',
    },
    // Scenario 2: Monitor worker execution
    monitor_workers: {
      executor: 'constant-vus',
      vus: 2,
      duration: '90s',
      startTime: '10s',
      exec: 'monitorWorkers',
    },
  },
  thresholds: {
    worker_execution_duration: ['p(95)<60000'], // 95% complete in < 60s
    http_req_failed: ['rate<0.005'],             // Error rate < 0.5%
    errors: ['rate<0.005'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key-12345';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || 'admin-token-12345';

const params = {
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
  },
};

// Track worker run IDs
let workerRunIds = [];

export function triggerWorkers() {
  // Trigger daily-refresh worker
  const triggerUrl = `${BASE_URL}/api/workers/daily-refresh/trigger`;
  const triggerPayload = JSON.stringify({
    maxLeads: 500,
    force: true,
  });

  const startTime = Date.now();
  const response = http.post(triggerUrl, triggerPayload, params);
  
  const success = check(response, {
    'trigger status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'trigger has runId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('runId') || body.hasOwnProperty('id');
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  if (success) {
    try {
      const body = JSON.parse(response.body);
      const runId = body.runId || body.id;
      workerRunIds.push(runId);
      console.log(`Worker triggered: ${runId}`);
    } catch {
      console.log('Failed to parse trigger response');
    }
  } else {
    console.log(`Worker trigger failed: ${response.status}`);
  }

  sleep(5); // Wait before next trigger
}

export function monitorWorkers() {
  if (workerRunIds.length === 0) {
    sleep(2);
    return;
  }

  // Check status of all worker runs
  const statusUrl = `${BASE_URL}/api/workers/runs`;
  const response = http.get(statusUrl, params);

  workerStatusChecks.add(1);

  const success = check(response, {
    'status check is 200': (r) => r.status === 200,
    'status has runs': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.runs) || Array.isArray(body);
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  if (success) {
    try {
      const body = JSON.parse(response.body);
      const runs = body.runs || body;

      // Check each worker run
      for (const runId of workerRunIds) {
        const run = runs.find(r => r.id === runId || r.runId === runId);
        
        if (run) {
          const status = run.status;
          const processed = run.leadsProcessed || run.processed || 0;

          if (status === 'completed') {
            const duration = run.duration || run.executionTime;
            if (duration) {
              workerExecutionDuration.add(duration);
            }
            leadsProcessed.add(processed);
            
            console.log(`Worker ${runId} completed: ${processed} leads in ${duration}ms`);
          } else if (status === 'failed') {
            console.log(`Worker ${runId} failed`);
            errorRate.add(1);
          }
        }
      }
    } catch (e) {
      console.log(`Failed to parse status response: ${e}`);
    }
  }

  sleep(3); // Check every 3 seconds
}

export function handleSummary(data) {
  return {
    'performance/results/workers-benchmark-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  let summary = '\n';
  summary += 'Performance Test Summary: Workers Benchmark (Daily Refresh)\n';
  summary += '='.repeat(60) + '\n\n';

  // Worker execution metrics
  const workerDuration = data.metrics.worker_execution_duration;
  if (workerDuration && workerDuration.values.count > 0) {
    summary += 'Worker Execution Duration:\n';
    summary += `  - p50: ${(workerDuration.values['p(50)'] / 1000).toFixed(2)}s\n`;
    summary += `  - p95: ${(workerDuration.values['p(95)'] / 1000).toFixed(2)}s (target: <60s)\n`;
    summary += `  - avg: ${(workerDuration.values.avg / 1000).toFixed(2)}s\n`;
    summary += `  - max: ${(workerDuration.values.max / 1000).toFixed(2)}s\n\n`;
  }

  // Leads processed
  const leadsProcessedMetric = data.metrics.leads_processed;
  if (leadsProcessedMetric) {
    summary += 'Leads Processing:\n';
    summary += `  - total leads processed: ${leadsProcessedMetric.values.count}\n`;
    summary += `  - leads per second: ${leadsProcessedMetric.values.rate.toFixed(2)}\n\n`;
  }

  // Status checks
  const statusChecks = data.metrics.worker_status_checks;
  if (statusChecks) {
    summary += 'Monitoring:\n';
    summary += `  - status checks: ${statusChecks.values.count}\n`;
    summary += `  - check rate: ${statusChecks.values.rate.toFixed(2)}/s\n\n`;
  }

  // HTTP metrics
  const httpReqDuration = data.metrics.http_req_duration;
  if (httpReqDuration) {
    summary += 'HTTP Request Duration:\n';
    summary += `  - avg: ${httpReqDuration.values.avg.toFixed(2)}ms\n`;
    summary += `  - p95: ${httpReqDuration.values['p(95)'].toFixed(2)}ms\n\n`;
  }

  // Error rate
  const httpReqFailed = data.metrics.http_req_failed;
  if (httpReqFailed) {
    const errorPct = (httpReqFailed.values.rate * 100).toFixed(2);
    summary += 'Error Rate:\n';
    summary += `  - failed: ${httpReqFailed.values.passes} requests\n`;
    summary += `  - rate: ${errorPct}% (target: <0.5%)\n\n`;
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
