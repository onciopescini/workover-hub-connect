/**
 * k6 Spike Test
 * 
 * Tests system behavior under sudden traffic spikes
 * (e.g., viral event, marketing campaign)
 * 
 * Run: k6 run tests/load/spike-test.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },    // Normal traffic
    { duration: '30s', target: 1000 },  // SPIKE! 0→1000 in 30s
    { duration: '2m', target: 1000 },   // Sustain spike
    { duration: '30s', target: 50 },    // Return to normal
    { duration: '1m', target: 0 },      // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // More lenient during spike
    http_req_failed: ['rate<0.05'], // 5% error rate acceptable during spike
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://khtqwzvrxzsgfhsslwyz.supabase.co';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk';

const headers = {
  'Content-Type': 'application/json',
  'apikey': ANON_KEY,
};

export default function () {
  // Simulate homepage load during spike
  const res = http.get(`${BASE_URL}/rest/v1/spaces?published=eq.true&select=id,title,price_per_day&limit=10`, {
    headers,
  });

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  if (!success) errorRate.add(1);

  sleep(0.5); // Minimal think time during spike
}

export function handleSummary(data) {
  return {
    'load-test-results/spike-test-summary.json': JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  return `
    ========== Spike Test Results ==========
    
    VUs: ${data.metrics.vus.values.max} (max)
    Requests: ${data.metrics.http_reqs.values.count}
    Duration: ${data.state.testRunDurationMs / 1000}s
    
    Response Times:
      - p(50): ${data.metrics.http_req_duration.values['p(50)']}ms
      - p(95): ${data.metrics.http_req_duration.values['p(95)']}ms
      - p(99): ${data.metrics.http_req_duration.values['p(99)']}ms
    
    Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
    
    ${data.metrics.http_req_duration.values['p(95)'] < 1000 ? '✅' : '❌'} p95 < 1s
    ${data.metrics.http_req_failed.values.rate < 0.05 ? '✅' : '❌'} Error rate < 5%
    
    =========================================
  `;
}
