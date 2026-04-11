import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

/**
 * Cloudflare Workers test config.
 * Tests run inside actual workerd (same V8 isolate as production).
 *
 *   • import.meta.env   → reads from test env bindings below
 *   • fetch()           → CF Workers fetch (not Node.js)
 *   • KV / D1 / Queues  → local in-memory bindings
 *
 * Run: pnpm test:workers  |  pnpm test:workers:watch
 */
export default defineWorkersConfig({
  test: {
    name: 'workers',
    globals: true,
    include: [
      'tests/workers/**/*.{test,spec}.{ts,tsx}',
      'tests/api/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['node_modules', 'dist', '.astro'],

    poolOptions: {
      workers: {
        // Point at the frontend wrangler config so bindings (KV, D1, vars) are
        // declared correctly for tests.  wrangler reads .dev.vars for secrets.
        wrangler: { configPath: './wrangler.jsonc' },

        // Inline miniflare options used in tests (supplements wrangler.jsonc).
        // These provide test doubles for expensive external calls.
        miniflare: {
          // KV namespaces — in-memory for tests
          kvNamespaces: ['CACHE', 'SESSION'],

          // D1 databases — in-memory SQLite
          d1Databases: ['DB'],

          // Vars available as import.meta.env.* in SSR API routes
          bindings: {
            GEOAPIFY_API_KEY: 'test-geoapify-key',
            API_SERVICE_TOKEN: 'test-token',
            ENVIRONMENT: 'test',
          },
        },
      },
    },
  },
});
