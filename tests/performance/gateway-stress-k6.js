import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');
export let requestCount = new Counter('requests');

// Test configuration
export let options = {
  stages: [
    // Warm-up phase
    { duration: '2m', target: 10 },   // Ramp up to 10 users over 2 minutes
    
    // Load testing phases
    { duration: '5m', target: 50 },   // Stay at 50 users for 5 minutes
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users for 5 minutes
    
    // Stress testing phases
    { duration: '2m', target: 500 },  // Ramp up to 500 users
    { duration: '5m', target: 500 },  // Stay at 500 users for 5 minutes
    { duration: '2m', target: 1000 }, // Ramp up to 1000 users
    { duration: '5m', target: 1000 }, // Stay at 1000 users for 5 minutes
    
    // Cool down
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  
  thresholds: {
    // Performance thresholds
    'http_req_duration': ['p(95)<500'], // 95% of requests should be below 500ms
    'http_req_failed': ['rate<0.05'],   // Error rate should be less than 5%
    'errors': ['rate<0.05'],            // Custom error rate threshold
  },
};

// Test configuration - UPDATE THESE VALUES
const BASE_URL = 'https://your-gateway-url.com'; // Replace with your gateway URL
const API_ENDPOINTS = [
  '/api/health',           // Health check endpoint
  '/api/users',           // GET users endpoint
  '/api/products',        // GET products endpoint
  // Add more endpoints as needed
];

export default function () {
  // Select random endpoint for this iteration
  const endpoint = API_ENDPOINTS[Math.floor(Math.random() * API_ENDPOINTS.length)];
  const url = `${BASE_URL}${endpoint}`;
  
  // Add headers if needed (authentication, content-type, etc.)
  const params = {
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': 'Bearer your-token-here', // Uncomment if auth needed
    },
    timeout: '30s', // Request timeout
  };
  
  // Make HTTP request
  const startTime = Date.now();
  const response = http.get(url, params);
  const endTime = Date.now();
  
  // Record custom metrics
  requestCount.add(1);
  responseTime.add(endTime - startTime);
  
  // Check response
  const result = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'response has body': (r) => r.body && r.body.length > 0,
  });
  
  // Record errors
  if (!result) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
  
  // Think time between requests (simulate real user behavior)
  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

// Setup function - runs once before the test
export function setup() {
  console.log('Starting stress test...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Testing endpoints: ${API_ENDPOINTS.join(', ')}`);
  
  // Optional: Perform any setup operations
  // const setupResponse = http.get(`${BASE_URL}/api/health`);
  // return { setupData: setupResponse.json() };
}

// Teardown function - runs once after the test
export function teardown(data) {
  console.log('Stress test completed!');
  console.log('Check the results for performance metrics.');
}

// use --summary-trend-stats to export it