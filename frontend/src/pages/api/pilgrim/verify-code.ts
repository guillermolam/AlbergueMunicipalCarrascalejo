/**
 * POST /api/pilgrim/verify-code
 *
 * Body: { email: string, code: string }
 *
 * Reads the `pilgrim_otp_token` cookie, verifies the HMAC signature with
 * CLERK_SECRET_KEY, checks expiry / email / code match, then returns the
 * pilgrim's Clerk data (documents, pilgrimData from privateMetadata).
 *
 * On success clears the cookie (Max-Age=0).
 */
import type { APIRoute } from 'astro';
import { clerkClient } from '@clerk/astro/server';

export const prerender = false;

// ── Types ─────────────────────────────────────────────────────────────────────

interface OtpPayload {
  email: string;
  code: string;
  userId: string;
  exp: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function clearCookieHeader(): string {
  return 'pilgrim_otp_token=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/';
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Verify that `token` (base64url_payload.hex_sig) was produced by our signPayload.
 * Returns the decoded payload if valid, null otherwise.
 */
async function verifyToken(token: string, secret: string): Promise<OtpPayload | null> {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx < 0) return null;

    const payloadB64 = token.slice(0, dotIdx);
    const sigHex = token.slice(dotIdx + 1);

    // Re-add base64 padding
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payloadStr = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const payload = JSON.parse(payloadStr) as OtpPayload;

    // Recompute expected signature
    const key = await importHmacKey(secret);
    const enc = new TextEncoder();
    const data = enc.encode(JSON.stringify(payload));
    const sig = await crypto.subtle.sign('HMAC', key, data);

    const expectedHex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time compare (avoid timing attacks)
    if (expectedHex.length !== sigHex.length) return null;
    let diff = 0;
    for (let i = 0; i < expectedHex.length; i++) {
      diff |= expectedHex.charCodeAt(i) ^ sigHex.charCodeAt(i);
    }
    if (diff !== 0) return null;

    return payload;
  } catch {
    return null;
  }
}

/** Parse cookie header string → Map<name, value> */
function parseCookies(cookieHeader: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    const value = decodeURIComponent(part.slice(eq + 1).trim());
    map.set(name, value);
  }
  return map;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const POST: APIRoute = async (context) => {
  let body: { email?: unknown; code?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';

  if (!email || !code) {
    return jsonResponse({ success: false, error: 'email and code are required' }, 400);
  }

  // ── Read cookie ──────────────────────────────────────────────────────────────
  const cookieStr = context.request.headers.get('cookie') ?? '';
  const cookies = parseCookies(cookieStr);
  const rawToken = cookies.get('pilgrim_otp_token');

  if (!rawToken) {
    return jsonResponse({ success: false, error: 'No OTP session found. Please request a new code.' }, 400);
  }

  const secret = import.meta.env.CLERK_SECRET_KEY as string | undefined;
  if (!secret) {
    return jsonResponse({ success: false, error: 'Server misconfiguration' }, 500);
  }

  // ── Verify token ─────────────────────────────────────────────────────────────
  const payload = await verifyToken(rawToken, secret);

  if (!payload) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid or tampered token.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearCookieHeader() },
    });
  }

  if (Date.now() > payload.exp) {
    return new Response(JSON.stringify({ success: false, error: 'OTP expired. Please request a new code.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearCookieHeader() },
    });
  }

  if (payload.email !== email) {
    return jsonResponse({ success: false, error: 'Email mismatch.' }, 400);
  }

  if (payload.code !== code) {
    return jsonResponse({ success: false, error: 'Incorrect code. Please try again.' }, 400);
  }

  // ── Fetch Clerk user data ─────────────────────────────────────────────────────
  let documents: unknown[] = [];
  let pilgrimData: Record<string, unknown> = {};

  try {
    const clerk = clerkClient(context);
    const user = await clerk.users.getUser(payload.userId);
    const meta = (user.privateMetadata ?? {}) as Record<string, unknown>;
    documents = Array.isArray(meta.documents) ? (meta.documents as unknown[]) : [];
    pilgrimData = (meta.pilgrimData as Record<string, unknown>) ?? {};
  } catch (err) {
    console.error('[verify-code] Clerk getUser error:', err);
    // Non-fatal — proceed with empty data
  }

  // ── Clear cookie on success ───────────────────────────────────────────────────
  return new Response(
    JSON.stringify({
      success: true,
      userId: payload.userId,
      email: payload.email,
      documents,
      pilgrimData,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearCookieHeader(),
      },
    }
  );
};
