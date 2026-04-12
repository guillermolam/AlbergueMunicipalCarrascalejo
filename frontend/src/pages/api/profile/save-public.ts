/**
 * POST /api/profile/save-public
 *
 * Writes a section of pilgrim data to Clerk publicMetadata (server-side write,
 * readable by admin/staff server-side via clerkClient).
 *
 * Allowed sections: emergency | vehicles | belongings | lockerNum
 *
 * Body: { section: string, data: unknown }
 */
import type { APIRoute } from 'astro';
import { clerkClient } from '@clerk/astro/server';

export const prerender = false;

const ALLOWED_SECTIONS = new Set(['emergency', 'emergencyContacts', 'vehicles', 'belongings', 'lockerNum', 'pets']);

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;

  const user = await locals.currentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { section?: unknown; data?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const section = body.section;
  if (typeof section !== 'string' || !ALLOWED_SECTIONS.has(section)) {
    return new Response(JSON.stringify({ error: 'Invalid section' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const current = (user.publicMetadata ?? {}) as Record<string, unknown>;
    const clerk = clerkClient(context);
    await clerk.users.updateUserMetadata(user.id, {
      publicMetadata: { ...current, [section]: body.data },
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[save-public] clerkClient error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
