/**
 * Server-side configuration for the Albergue frontend.
 *
 * SECURITY RULES enforced here:
 *  1. Secrets (JWT, encryption keys, service passwords) are read ONLY from
 *     server-side env vars (process.env / Cloudflare Secrets).  They must
 *     NEVER use the `PUBLIC_` prefix — that prefix inlines values into the
 *     client-side JS bundle.
 *  2. Supabase is NOT used in this project; the backend uses Cloudflare D1.
 *     The previous Supabase import has been removed to avoid shipping a
 *     ~500 KB unused library.
 *  3. Redis is not available in Cloudflare Workers; use KV instead.
 *
 * Only call functions from this module inside Astro server components
 * (frontmatter) or Astro Actions — never in client-side scripts.
 */

// ── Environment helpers ────────────────────────────────────────────────────

const isServer = typeof window === 'undefined';

/**
 * Read a value that must stay server-side only.
 * Returns undefined on the client so secrets are never leaked.
 */
const serverEnv = (name: string): string | undefined =>
  isServer ? (process.env[name] ?? import.meta.env[name]) : undefined;

// ── Public (non-secret) env vars — safe to expose in the browser ───────────

/** Base URL for the backend API gateway. Defaults to relative `/api`. */
export const API_BASE_URL: string = import.meta.env.PUBLIC_API_URL ?? '/api';

/** Mock mode flag — set PUBLIC_API_MODE=mock to skip real API calls. */
export const API_MODE: string = import.meta.env.PUBLIC_API_MODE ?? 'real';

// ── Server-only configuration (never exposed to the browser) ──────────────

export interface ServerConfig {
  /** Internal service-to-service bearer token for server-side API calls. */
  apiServiceToken: string;
  /** Camino-specific hostel settings. */
  camino: {
    maxBookingDays: number;
    minBookingDays: number;
    checkInTime: string;
    checkOutTime: string;
    maxGuestsPerRoom: number;
    emergencyContact: string;
  };
}

let _serverConfig: ServerConfig | null = null;

/**
 * Returns server-only config. Safe to call in Astro frontmatter or Actions.
 * Throws if called on the client side.
 */
export function getServerConfig(): ServerConfig {
  if (!isServer) {
    throw new Error('getServerConfig() must only be called server-side.');
  }

  if (_serverConfig) return _serverConfig;

  _serverConfig = {
    apiServiceToken: serverEnv('API_SERVICE_TOKEN') ?? '',
    camino: {
      maxBookingDays: Number(serverEnv('CAMINO_MAX_BOOKING_DAYS') ?? 30),
      minBookingDays: Number(serverEnv('CAMINO_MIN_BOOKING_DAYS') ?? 1),
      checkInTime:    serverEnv('CAMINO_CHECK_IN_TIME')    ?? '14:00',
      checkOutTime:   serverEnv('CAMINO_CHECK_OUT_TIME')   ?? '11:00',
      maxGuestsPerRoom: Number(serverEnv('CAMINO_MAX_GUESTS_PER_ROOM') ?? 8),
      emergencyContact: serverEnv('CAMINO_EMERGENCY_CONTACT') ?? '+34-924-000-000',
    },
  };

  return _serverConfig;
}

/** Clears the config cache — useful in tests. */
export function clearConfigCache(): void {
  _serverConfig = null;
}

// ── Environment helpers re-exported for convenience ───────────────────────

export function getEnvironment(): 'development' | 'staging' | 'production' {
  const env = isServer
    ? (serverEnv('NODE_ENV') ?? serverEnv('ENVIRONMENT') ?? 'development')
    : (import.meta.env.MODE ?? 'development');
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
}

export const isProduction  = () => getEnvironment() === 'production';
export const isDevelopment = () => getEnvironment() === 'development';
