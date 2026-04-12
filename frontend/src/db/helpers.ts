/**
 * Shared helpers for admin SSR API routes and Astro actions.
 *
 * DB access strategy:
 *   Production (Cloudflare Pages/Workers): `import { env } from 'cloudflare:workers'`
 *     gives the D1 binding directly from the runtime.
 *   Local dev (Vite, platformProxy disabled): D1 is not available — admin API routes
 *     that need the database must be tested against the backend api-service on port 8787
 *     or via `wrangler pages dev` (which uses miniflare).
 */

import { createDb } from './index';

// Re-export schema tables so API routes only need one import
export {
  dormitories,
  pricingRules,
  hostelServices,
  hostelConfig,
  bookings,
  beds,
  pricing,
  hostelRules,
  nearbyAttractions,
  reviews,
  reviewScores,
} from './schema';

/** Return a Drizzle DB instance bound to the runtime D1 database.
 *
 * Pass the `D1Database` binding explicitly (from context.locals or wrangler env)
 * so this helper works in both Cloudflare Workers and Vite SSR contexts.
 */
export function db(d1: D1Database) {
  return createDb(d1);
}

/**
 * Get the D1 binding from the Cloudflare Workers runtime env.
 * Returns null in Vite dev mode (no miniflare) — callers must handle this.
 */
export async function getD1(): Promise<D1Database | null> {
  try {
    const { env } = await import('cloudflare:workers');
    const d1 = (env as unknown as { DB?: D1Database }).DB ?? null;
    return d1;
  } catch {
    // Vite dev mode — cloudflare:workers not available
    return null;
  }
}

/** Build a JSON Response with the correct Content-Type header. */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Build a JSON error Response. */
export function jsonError(message: string, status = 400): Response {
  return json({ error: message }, status);
}

/**
 * Assert that the caller has the 'admin' role (set via Clerk publicMetadata.role).
 * Returns a 403 Response if not authorised, or null if authorised.
 */
export function requireAdmin(locals: App.Locals): Response | null {
  if (locals.role !== 'admin') {
    return jsonError('Unauthorized: admin role required', 403);
  }
  return null;
}

/** Convert euros (float) to integer cents, rounding to nearest. */
export function eurToCents(eur: number): number {
  return Math.round(eur * 100);
}

/** Convert integer cents to euros (2 decimal places). */
export function centsToEur(cents: number): number {
  return cents / 100;
}
