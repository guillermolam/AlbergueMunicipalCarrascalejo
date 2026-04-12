/**
 * POST /api/pilgrim/send-code
 *
 * Body: { email: string }
 *
 * Generates a 6-digit OTP, creates/finds the Clerk user, signs a token with
 * HMAC-SHA256 (CLERK_SECRET_KEY as key), sets an httpOnly cookie, and in
 * development also returns the code in _devCode for easier testing.
 *
 * This endpoint does NOT require the primary pilgrim to be authenticated —
 * any pilgrim (including group extras) can self-verify their own email.
 */
import type { APIRoute } from 'astro';
import { clerkClient } from '@clerk/astro/server';

export const prerender = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Generate a cryptographically random 6-digit string. */
function generateOtp(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0]! % 1_000_000).padStart(6, '0');
}

// ── HMAC helpers (Web Crypto API — available in CF Workers + modern Node) ─────

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

async function signPayload(payload: object, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const enc = new TextEncoder();
  const data = enc.encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('HMAC', key, data);
  // Encode as hex
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // Token = base64url(payload) + '.' + hex(signature)
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${payloadB64}.${hex}`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const POST: APIRoute = async (context) => {
  let body: { email?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !isValidEmail(email)) {
    return jsonResponse({ error: 'Valid email address is required' }, 400);
  }

  const secret = import.meta.env.CLERK_SECRET_KEY as string | undefined;
  if (!secret) {
    console.error('[send-code] CLERK_SECRET_KEY not configured');
    return jsonResponse({ error: 'Server misconfiguration' }, 500);
  }

  // ── Find or create Clerk user ────────────────────────────────────────────────
  let userId: string;
  try {
    const clerk = clerkClient(context);
    const searchResult = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
    const existing = searchResult.data[0];

    if (existing) {
      userId = existing.id;
    } else {
      const created = await clerk.users.createUser({
        emailAddress: [email],
        skipPasswordRequirement: true,
      });
      userId = created.id;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Clerk error';
    console.error('[send-code] Clerk error:', msg);
    return jsonResponse({ error: msg }, 500);
  }

  // ── Generate OTP ─────────────────────────────────────────────────────────────
  const code = generateOtp();
  const exp = Date.now() + 600_000; // 10 minutes

  const payload = { email, code, userId, exp };

  // ── Sign token ───────────────────────────────────────────────────────────────
  let token: string;
  try {
    token = await signPayload(payload, secret);
  } catch (err) {
    console.error('[send-code] Token signing failed:', err);
    return jsonResponse({ error: 'Token generation failed' }, 500);
  }

  // ── Send OTP (development: return in body; production: log / email) ──────────
  if (import.meta.env.DEV) {
    console.info(`[send-code DEV] OTP for ${email}: ${code}`);
  } else {
    // TODO: integrate real transactional email service (SendGrid / Resend / etc.)
    console.info(`[send-code] OTP for ${email} (userId=${userId}): ${code}`);
  }

  // ── Set httpOnly cookie ──────────────────────────────────────────────────────
  const cookieHeader = [
    `pilgrim_otp_token=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=600',
    'Path=/',
    ...(import.meta.env.PROD ? ['Secure'] : []),
  ].join('; ');

  const responseBody: Record<string, unknown> = { success: true, userId };
  if (import.meta.env.DEV) {
    responseBody._devCode = code;
  }

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieHeader,
    },
  });
};
