/**
 * Drizzle ORM D1 client factory.
 *
 * Usage in Astro SSR API routes (requires wrangler dev / CF runtime):
 *
 *   import { createDb } from '../../db';
 *   import { env } from 'cloudflare:workers';
 *
 *   const db = createDb(env.DB);
 *
 * The `env` object is the Cloudflare Worker runtime environment.
 * It is NOT available in `astro dev` (Vite) — use `wrangler dev` instead.
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export * from './schema';

export type AppDb = ReturnType<typeof createDb>;

export function createDb(d1: D1Database): ReturnType<typeof drizzle<typeof schema>> {
  return drizzle(d1, { schema });
}
