/**
 * Redis stub for Cloudflare Workers compatibility.
 *
 * The `redis` npm package requires Node.js TCP sockets (net/tls) which are
 * unavailable in the Cloudflare Workers runtime.  All functions here are
 * intentional no-ops so that any existing call-sites don't throw at runtime.
 *
 * ─── What to use instead ────────────────────────────────────────────────────
 *  • Short-lived cache  → Workers KV  (via Astro.locals.runtime.env.CACHE)
 *  • Session state      → Cloudflare KV or Durable Objects
 *  • Rate-limit counters → Cloudflare Zone Rate Limiting rules (free tier)
 *                         or Durable Objects (paid tier)
 * ────────────────────────────────────────────────────────────────────────────
 */

function warn(fn: string) {
  if (import.meta.env.DEV) {
    console.warn(
      `[redis stub] ${fn}() called — Redis is not available in Cloudflare Workers. Use KV instead.`
    );
  }
}

// Fake client shape so call-sites that destructure the client don't crash.
const noopClient = {
  get: async (_key: string) => null,
  setEx: async (_key: string, _ttl: number, _value: string) => {},
  del: async (_key: string) => {},
  quit: async () => {},
  on: (_event: string, _cb: (...args: unknown[]) => void) => noopClient,
  connect: async () => {},
  disconnect: async () => {},
};

/** @deprecated Use Workers KV via Astro.locals.runtime.env.CACHE instead. */
export async function getRedisClient() {
  warn('getRedisClient');
  return noopClient;
}

/** @deprecated Use Workers KV instead. */
export async function setRedisKey(_key: string, _value: string, _expireInSeconds = 3600) {
  warn('setRedisKey');
}

/** @deprecated Use Workers KV instead. */
export async function getRedisKey(_key: string): Promise<string | null> {
  warn('getRedisKey');
  return null;
}

/** @deprecated Use Workers KV instead. */
export async function deleteRedisKey(_key: string) {
  warn('deleteRedisKey');
}

/** @deprecated No-op — no persistent connection in Workers. */
export async function closeRedisConnection() {
  warn('closeRedisConnection');
}
