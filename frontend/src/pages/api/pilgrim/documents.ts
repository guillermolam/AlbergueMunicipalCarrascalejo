/**
 * GET  /api/pilgrim/documents?userId=xxx
 *   Returns private_metadata.documents[] for the given Clerk user.
 *   Requires the caller to be authenticated (primary pilgrim / admin).
 *
 * POST /api/pilgrim/documents
 *   Body: { userId: string; document: PilgrimDocument }
 *   Upserts a document into private_metadata.documents by document.id.
 *   Used by the upload flow to persist verified docs server-side.
 */
import type { APIRoute } from 'astro';
import { clerkClient } from '@clerk/astro/server';

export const prerender = false;

// ── Types (mirror the Clerk private_metadata schema agreed in session) ─────────
export interface PilgrimDocumentImage {
  side: 'front' | 'back' | 'photo';
  url: string;
  uploadedAt: string; // ISO 8601
}

export interface PilgrimDocument {
  id: string; // UUID
  type: 'dni' | 'nie' | 'passport' | 'eu_id_card';
  country: string; // ISO 3166-1 alpha-3, e.g. "ESP"
  expirationDate: string; // ISO 8601 date, e.g. "2027-06-30"
  images: PilgrimDocumentImage[];
  verified: boolean;
  uploadedAt: string; // ISO 8601
  ocrFields?: {
    firstName?: string;
    lastName?: string;
    lastName2?: string;
    documentNumber?: string;
    birthDate?: string;
    nationality?: string;
    gender?: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Return true if the document's expirationDate is in the future (valid). */
export function isDocumentValid(doc: PilgrimDocument): boolean {
  if (!doc.expirationDate) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return new Date(doc.expirationDate) >= now;
}

type ClerkLocals = { currentUser?: () => Promise<{ id: string } | null>; role?: string };

// ── GET ───────────────────────────────────────────────────────────────────────
export const GET: APIRoute = async (context) => {
  const { locals } = context;
  const caller = await (locals as unknown as ClerkLocals).currentUser?.();
  if (!caller) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(context.request.url);
  const targetUserId = url.searchParams.get('userId');

  if (!targetUserId) {
    return jsonResponse({ error: 'Missing userId query param' }, 400);
  }

  // Only allow fetching own docs unless caller is admin
  const callerRole = (locals as unknown as ClerkLocals).role;
  if (targetUserId !== caller.id && callerRole !== 'admin') {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  try {
    const clerk = clerkClient(context);
    const user = await clerk.users.getUser(targetUserId);
    const meta = (user.privateMetadata ?? {}) as Record<string, unknown>;
    const documents: PilgrimDocument[] = Array.isArray(meta.documents)
      ? (meta.documents as PilgrimDocument[])
      : [];

    return jsonResponse({ documents });
  } catch (err) {
    console.error('[GET /api/pilgrim/documents] Clerk error:', err);
    return jsonResponse({ error: 'Server error' }, 500);
  }
};

// ── POST ──────────────────────────────────────────────────────────────────────
export const POST: APIRoute = async (context) => {
  const { locals } = context;
  const caller = await (locals as unknown as ClerkLocals).currentUser?.();
  if (!caller) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body: { userId?: unknown; document?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { userId, document: doc } = body;

  if (typeof userId !== 'string' || !userId) {
    return jsonResponse({ error: 'Missing userId' }, 400);
  }
  if (!doc || typeof doc !== 'object') {
    return jsonResponse({ error: 'Missing document' }, 400);
  }

  // Allow writing to own docs or if caller is admin
  const callerRole = (locals as unknown as ClerkLocals).role;
  if (userId !== caller.id && callerRole !== 'admin') {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  try {
    const clerk = clerkClient(context);
    const user = await clerk.users.getUser(userId);
    const meta = (user.privateMetadata ?? {}) as Record<string, unknown>;
    const existing: PilgrimDocument[] = Array.isArray(meta.documents)
      ? (meta.documents as PilgrimDocument[])
      : [];

    const incoming = doc as PilgrimDocument;
    if (!incoming.id) {
      return jsonResponse({ error: 'document.id is required' }, 400);
    }

    // Upsert by id
    const idx = existing.findIndex((d) => d.id === incoming.id);
    if (idx >= 0) {
      existing[idx] = incoming;
    } else {
      existing.push(incoming);
    }

    await clerk.users.updateUserMetadata(userId, {
      privateMetadata: { ...meta, documents: existing },
    });

    return jsonResponse({ ok: true, documents: existing });
  } catch (err) {
    console.error('[POST /api/pilgrim/documents] Clerk error:', err);
    return jsonResponse({ error: 'Server error' }, 500);
  }
};
