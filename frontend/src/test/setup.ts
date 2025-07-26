
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NODE_ENV: 'test',
    VITE_API_URL: 'http://localhost:5000',
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

// Setup cleanup
afterEach(() => {
  vi.clearAllMocks();
});
