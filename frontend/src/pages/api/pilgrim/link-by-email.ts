/**
 * POST /api/pilgrim/link-by-email
 *
 * Body: { email: string }
 *
 * Finds an existing Clerk user by email address OR creates a new one with a
 * temporary password (the user will complete sign-up via an email magic-link).
 *
 * Returns:
 *   { userId: string; exists: boolean; documents: PilgrimDocument[] }
 *
 * This endpoint is used by the DocumentUploadIsland to associate additional
 * pilgrims (beyond the primary logged-in user) with Clerk accounts so their
 * verified documents can be stored in private_metadata.
 *
 * Security: requires the primary pilgrim to be authenticated.
 */
import type { APIRoute } from 'astro';
import { clerkClient } from '@clerk/astro/server';
import type { PilgrimDocument } from './documents';

export const prerender = false;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Validate an email address with a basic regex. */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type ClerkLocals = { currentUser?: () => Promise<{ id: string } | null> };

export const POST: APIRoute = async (context) => {
  const { locals } = context;
  // Require the primary pilgrim to be signed in
  const caller = await (locals as unknown as ClerkLocals).currentUser?.();
  if (!caller) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

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

  try {
    const clerk = clerkClient(context);

    // Try to find an existing Clerk user with this email
    const searchResult = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
    const existing = searchResult.data[0];

    if (existing) {
      const meta = (existing.privateMetadata ?? {}) as Record<string, unknown>;
      const documents: PilgrimDocument[] = Array.isArray(meta.documents)
        ? (meta.documents as PilgrimDocument[])
        : [];
      return jsonResponse({ userId: existing.id, exists: true, documents });
    }

    // Create a new Clerk user — password-less (email magic link will be sent by Clerk)
    const created = await clerk.users.createUser({
      emailAddress: [email],
      // No password — the user can set one or use social login later
      skipPasswordRequirement: true,
    });

    return jsonResponse({ userId: created.id, exists: false, documents: [] });
  } catch (err: unknown) {
    // Clerk may throw if the email already exists in a different form — handle gracefully
    const msg = err instanceof Error ? err.message : 'Server error';
    console.error('[POST /api/pilgrim/link-by-email] Clerk error:', msg);

    // If Clerk reports the email already exists but getUserList returned nothing,
    // try one more search with a broader query
    if (typeof msg === 'string' && msg.toLowerCase().includes('already')) {
      try {
        const clerk2 = clerkClient(context);
        const retry = await clerk2.users.getUserList({ emailAddress: [email], limit: 1 });
        const found = retry.data[0];
        if (found) {
          const meta = (found.privateMetadata ?? {}) as Record<string, unknown>;
          const documents: PilgrimDocument[] = Array.isArray(meta.documents)
            ? (meta.documents as PilgrimDocument[])
            : [];
          return jsonResponse({ userId: found.id, exists: true, documents });
        }
      } catch {
        /* fall through */
      }
    }

    return jsonResponse({ error: msg }, 500);
  }
};
