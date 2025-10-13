/**
 * k6 Stress Test
 * 
 * Tests system breaking point by gradually increasing load
 * until system starts failing
 * 
 * Run: k6 run tests/load/stress-test.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const failedRequests = new Counter('failed_requests');

export const options = {
  stages: [
    { duration: '2m', target: 500 },   // Ramp to 500
    { duration: '2m', target: 1000 },  // Ramp to 1000
    { duration: '2m', target: 2000 },  // Ramp to 2000
    { duration: '2m', target: 3000 },  // Ramp to 3000
    { duration: '2m', target: 5000 },  // Ramp to 5000 (likely breaking point)
    { duration: '5m', target: 5000 },  // Sustain max load
    { duration: '2m', target: 0 },     // Cool down
  ],
  thresholds: {
    // We expect failures during stress test - tracking for analysis
    http_req_duration: ['p(50)<500', 'p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://khtqwzvrxzsgfhsslwyz.supabase.co';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk';

const headers = {
  'Content-Type': 'application/json',
  'apikey': ANON_KEY,
};

export default function () {
  const res = http.get(`${BASE_URL}/rest/v1/spaces?published=eq.true&select=*&limit=20`, {
    headers,
    timeout: '10s',
  });

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has valid response': (r) => r.body && r.body.length > 0,
  });

  if (!success) {
    errorRate.add(1);
    failedRequests.add(1);
  }

  sleep(0.3); // Aggressive load
}

export function handleSummary(data) {
  const breakingPoint = findBreakingPoint(data);
  
  return {
    'load-test-results/stress-test-summary.json': JSON.stringify({
      ...data,
      analysis: {
        breakingPoint,
        maxSuccessfulVUs: breakingPoint - 100,
        recommendedMaxVUs: Math.floor((breakingPoint - 100) * 0.7), // 70% of max for safety
      },
    }, null, 2),
  };
}

function findBreakingPoint(data) {
  // Simplified - analyze error rate over time to find breaking point
  const errorRateThreshold = 0.1; // 10% error rate = breaking point
  
  if (data.metrics.http_req_failed?.values?.rate > errorRateThreshold) {
    return Math.floor(data.metrics.vus.values.max * 0.8);
  }
  
  return data.metrics.vus.values.max;
}
