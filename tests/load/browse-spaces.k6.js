/**
 * k6 Load Test - Browse Spaces
 * 
 * Tests space browsing and filtering under heavy load
 * 
 * Run: k6 run tests/load/browse-spaces.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const requestCount = new Counter('requests');

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Quick ramp to 100
    { duration: '3m', target: 500 },  // Ramp to 500 users
    { duration: '5m', target: 500 },  // Sustain 500 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    http_req_failed: ['rate<0.005'], // 0.5% error rate
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://khtqwzvrxzsgfhsslwyz.supabase.co';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk';

const headers = {
  'Content-Type': 'application/json',
  'apikey': ANON_KEY,
};

const categories = ['private_office', 'meeting_room', 'coworking', 'event_space'];
const workEnvironments = ['quiet', 'collaborative', 'creative'];

export default function () {
  requestCount.add(1);

  // Random search scenarios
  const scenario = Math.floor(Math.random() * 4);

  switch (scenario) {
    case 0:
      // Browse all spaces
      const allRes = http.get(`${BASE_URL}/rest/v1/spaces?published=eq.true&select=*&limit=20`, {
        headers,
        tags: { name: 'browse_all' },
      });
      check(allRes, { 'status 200': (r) => r.status === 200 }) || errorRate.add(1);
      break;

    case 1:
      // Filter by category
      const category = categories[Math.floor(Math.random() * categories.length)];
      const catRes = http.get(
        `${BASE_URL}/rest/v1/spaces?published=eq.true&category=eq.${category}&select=*&limit=20`,
        { headers, tags: { name: 'filter_category' } }
      );
      check(catRes, { 'status 200': (r) => r.status === 200 }) || errorRate.add(1);
      break;

    case 2:
      // Filter by work environment
      const env = workEnvironments[Math.floor(Math.random() * workEnvironments.length)];
      const envRes = http.get(
        `${BASE_URL}/rest/v1/spaces?published=eq.true&work_environment=eq.${env}&select=*&limit=20`,
        { headers, tags: { name: 'filter_environment' } }
      );
      check(envRes, { 'status 200': (r) => r.status === 200 }) || errorRate.add(1);
      break;

    case 3:
      // Paginated browse
      const offset = Math.floor(Math.random() * 100);
      const pageRes = http.get(
        `${BASE_URL}/rest/v1/spaces?published=eq.true&select=*&limit=20&offset=${offset}`,
        { headers, tags: { name: 'paginated_browse' } }
      );
      check(pageRes, { 'status 200': (r) => r.status === 200 }) || errorRate.add(1);
      break;
  }

  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s think time
}

export function handleSummary(data) {
  return {
    'load-test-results/browse-spaces-summary.json': JSON.stringify(data, null, 2),
  };
}
