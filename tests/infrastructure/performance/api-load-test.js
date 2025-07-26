
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],   // Error rate must be below 10%
    errors: ['rate<0.1'],            // Custom error rate
  },
};

const BASE_URL = 'http://0.0.0.0:5000';

export default function () {
  // Test health endpoint
  let response = http.get(`${BASE_URL}/api/health`);
  check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test pricing endpoint
  response = http.get(`${BASE_URL}/api/pricing`);
  check(response, {
    'pricing status is 200': (r) => r.status === 200,
    'pricing response time < 300ms': (r) => r.timings.duration < 300,
    'pricing has valid data': (r) => {
      const data = JSON.parse(r.body);
      return data.dormitory && data.currency;
    },
  }) || errorRate.add(1);

  sleep(1);

  // Test availability endpoint
  const availabilityPayload = JSON.stringify({
    checkIn: '2025-08-01',
    checkOut: '2025-08-03',
    guests: 1
  });

  response = http.post(`${BASE_URL}/api/availability`, availabilityPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    'availability status is 200': (r) => r.status === 200,
    'availability response time < 500ms': (r) => r.timings.duration < 500,
    'availability has valid response': (r) => {
      const data = JSON.parse(r.body);
      return typeof data.available === 'boolean';
    },
  }) || errorRate.add(1);

  sleep(2);

  // Test document validation endpoint
  const validationPayload = JSON.stringify({
    documentType: 'DNI',
    documentNumber: '12345678Z',
    email: 'test@example.com',
    phone: '+34123456789'
  });

  response = http.post(`${BASE_URL}/api/validate/document`, validationPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    'validation response received': (r) => r.status >= 200 && r.status < 500,
    'validation response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(3);
}

export function handleSummary(data) {
  return {
    'infrastructure/performance/results/summary.json': JSON.stringify(data, null, 2),
    'infrastructure/performance/results/summary.html': htmlReport(data),
  };
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>k6 Performance Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
        .pass { border-left: 5px solid #4CAF50; }
        .fail { border-left: 5px solid #f44336; }
    </style>
</head>
<body>
    <h1>k6 Performance Test Results</h1>
    <h2>Summary</h2>
    <div class="metric ${data.metrics.http_req_duration?.values?.p95 < 500 ? 'pass' : 'fail'}">
        <strong>Response Time (95th percentile):</strong> ${data.metrics.http_req_duration?.values?.p95?.toFixed(2)}ms
    </div>
    <div class="metric ${data.metrics.http_req_failed?.values?.rate < 0.1 ? 'pass' : 'fail'}">
        <strong>Error Rate:</strong> ${(data.metrics.http_req_failed?.values?.rate * 100)?.toFixed(2)}%
    </div>
    <div class="metric">
        <strong>Total Requests:</strong> ${data.metrics.http_reqs?.values?.count}
    </div>
    <div class="metric">
        <strong>Virtual Users:</strong> ${data.metrics.vus_max?.values?.max}
    </div>
</body>
</html>
  `;
}
