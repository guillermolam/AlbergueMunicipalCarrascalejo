/**
 * PUT /api/user/update-avatar
 *
 * Body: { userId: string, imageDataUrl: string }
 *
 * Converts a base64 data URL to a Blob and updates the Clerk user's
 * profile image via the Clerk Backend API.
 *
 * Returns: { success: true, avatarUrl: string } | { error: string }
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

/**
 * Convert a base64 data URL (`data:<mime>;base64,<data>`) to a Blob.
 * Works in Cloudflare Workers (no Node.js Buffer needed).
 */
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [header, base64] = dataUrl.split(',') as [string, string];
    const mimeMatch = /data:([^;]+);base64/.exec(header);
    if (!mimeMatch || !base64) return null;
    const mime = mimeMatch[1];

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.codePointAt(i) ?? 0;
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const PUT: APIRoute = async (context) => {
  let body: { userId?: unknown; imageDataUrl?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : '';

  if (!userId) {
    return jsonResponse({ error: 'userId is required' }, 400);
  }
  if (!imageDataUrl?.startsWith('data:image/')) {
    return jsonResponse({ error: 'imageDataUrl must be a valid image data URL' }, 400);
  }

  const blob = dataUrlToBlob(imageDataUrl);
  if (!blob) {
    return jsonResponse({ error: 'Failed to decode imageDataUrl' }, 400);
  }

  // Guard: reasonable size limit (2 MB for avatar)
  if (blob.size > 2 * 1024 * 1024) {
    return jsonResponse({ error: 'Avatar image too large (max 2 MB)' }, 413);
  }

  try {
    const clerk = clerkClient(context);

    // Clerk SDK expects a File object for updateUserProfileImage
    const file = new File([blob], 'avatar.jpg', { type: blob.type });
    const updated = await clerk.users.updateUserProfileImage(userId, { file });

    const avatarUrl =
      updated.imageUrl ?? (updated.profileImageUrl as string | undefined) ?? '';

    return jsonResponse({ success: true, avatarUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Clerk error';
    console.error('[PUT /api/user/update-avatar] Clerk error:', msg);
    return jsonResponse({ error: msg }, 500);
  }
};
