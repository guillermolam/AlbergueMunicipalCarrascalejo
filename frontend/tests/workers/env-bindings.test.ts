/**
 * Smoke-tests that verify CF Worker env bindings are wired correctly
 * when running through @cloudflare/vitest-pool-workers.
 *
 * These run inside real workerd — the same V8 isolate as production.
 * `env` is the CF runtime env object (KV, D1, vars).
 */

import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('CF Worker env bindings (workerd runtime)', () => {
  it('GEOAPIFY_API_KEY binding is available', () => {
    // In production this comes from `wrangler secret put GEOAPIFY_API_KEY`.
    // In tests it's provided by vitest.config.workers.ts miniflare.bindings.
    expect((env as Record<string, unknown>).GEOAPIFY_API_KEY).toBeTruthy();
  });

  it('CACHE KV namespace is bound', () => {
    expect((env as Record<string, unknown>).CACHE).toBeDefined();
  });

  it('KV get/put round-trip works in test env', async () => {
    const kv = (env as { CACHE: KVNamespace }).CACHE;
    await kv.put('test-key', 'hello-worker');
    const val = await kv.get('test-key');
    expect(val).toBe('hello-worker');
  });

  it('D1 database binding is available', () => {
    expect((env as Record<string, unknown>).DB).toBeDefined();
  });

  it('D1 executes SQL in the test env (in-memory SQLite)', async () => {
    const db = (env as { DB: D1Database }).DB;
    const result = await db.prepare('SELECT 1 + 1 AS sum').first<{ sum: number }>();
    expect(result?.sum).toBe(2);
  });
});
