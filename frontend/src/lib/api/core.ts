/**
 * Core HTTP client for the Albergue API
 * Wraps fetch with: base URL resolution, auth headers, timeout, error handling
 * Server-safe: checks import.meta.env.SSR before touching window/localStorage
 */

const API_BASE = import.meta.env.PUBLIC_API_URL ?? '/api';
const TIMEOUT_MS = 8_000;

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

function getAuthHeader(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { timeout?: number } = {}
): Promise<ApiResult<T>> {
  const { timeout = TIMEOUT_MS, ...fetchInit } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const res = await fetch(url, {
      ...fetchInit,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...fetchInit.headers,
      },
    });

    clearTimeout(timer);

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const errBody = (await res.json()) as { message?: string; error?: string };
        message = errBody.message ?? errBody.error ?? message;
      } catch { /* ignore */ }
      return { ok: false, error: { status: res.status, message } };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: { status: 0, message } };
  }
}

/** Server-side fetch (Astro frontmatter / endpoints) — uses server token from env */
export async function serverFetch<T>(
  path: string,
  init: RequestInit = {},
  serverToken?: string
): Promise<ApiResult<T>> {
  const token = serverToken ?? import.meta.env.API_SERVICE_TOKEN ?? '';
  return apiFetch<T>(path, {
    ...init,
    headers: {
      ...init.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
