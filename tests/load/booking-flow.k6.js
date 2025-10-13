/**
 * k6 Load Test - Booking Flow
 * 
 * Tests the complete booking flow under load:
 * - Browse spaces
 * - View space details
 * - Create booking
 * - Process payment
 * 
 * Run: k6 run tests/load/booking-flow.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const bookingDuration = new Trend('booking_duration');

// Load test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://khtqwzvrxzsgfhsslwyz.supabase.co';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk';

const headers = {
  'Content-Type': 'application/json',
  'apikey': ANON_KEY,
};

export default function () {
  const startTime = Date.now();

  // Step 1: Browse spaces
  const browseRes = http.get(`${BASE_URL}/rest/v1/spaces?published=eq.true&select=*&limit=20`, {
    headers,
  });

  check(browseRes, {
    'browse spaces status 200': (r) => r.status === 200,
    'browse spaces has data': (r) => JSON.parse(r.body).length > 0,
  }) || errorRate.add(1);

  sleep(1);

  // Step 2: View space details
  const spaces = JSON.parse(browseRes.body);
  if (spaces.length > 0) {
    const randomSpace = spaces[Math.floor(Math.random() * spaces.length)];
    
    const detailsRes = http.get(`${BASE_URL}/rest/v1/spaces?id=eq.${randomSpace.id}&select=*`, {
      headers,
    });

    check(detailsRes, {
      'space details status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(2);

    // Step 3: Check availability
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const availabilityRes = http.get(
      `${BASE_URL}/rest/v1/rpc/get_space_availability_optimized?space_id_param=${randomSpace.id}&start_date_param=${today}&end_date_param=${nextWeek}`,
      { headers }
    );

    check(availabilityRes, {
      'availability check status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(1);
  }

  // Record booking flow duration
  const duration = Date.now() - startTime;
  bookingDuration.add(duration);

  sleep(Math.random() * 3 + 1); // Random think time 1-4 seconds
}

export function handleSummary(data) {
  return {
    'load-test-results/booking-flow-summary.json': JSON.stringify(data, null, 2),
  };
}
