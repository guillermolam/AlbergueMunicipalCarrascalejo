import { defineConfig } from 'vitest/config';

/**
 * Component & unit test config.
 * Uses happy-dom (faster than jsdom) for DOM APIs.
 * Run: pnpm test  |  pnpm test:watch
 *
 * For CF Workers / SSR API route tests use vitest.config.workers.ts instead.
 */
export default defineConfig({
  test: {
    name: 'unit',
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      // API route unit tests — plain TS, no workerd needed
      'tests/api/**/*.{test,spec}.{ts,tsx}',
      // Library / utility unit tests
      'tests/lib/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      // Existing stubs import @testing-library/react (wrong lib — frontend uses Solid.js).
      // TODO: replace with @solidjs/testing-library once component tests are written.
      'tests/components/**',
      'tests/pages/**',
      // CF-binding tests belong in vitest.config.workers.ts
      'tests/workers/**',
      'node_modules',
      'dist',
      '.astro',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx,astro}'],
      exclude: ['src/env.d.ts', 'src/**/*.d.ts'],
    },
  },
});
