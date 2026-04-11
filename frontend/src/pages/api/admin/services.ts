/**
 * GET /api/admin/services  — list all hostel services
 * POST /api/admin/services — create a new service
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { db, getD1, requireAdmin, json, jsonError, eurToCents, centsToEur, hostelServices } from '../../../db/helpers';

export const GET: APIRoute = async ({ locals }) => {
  const deny = requireAdmin(locals);
  if (deny) return deny;

  const d1 = await getD1();
  if (!d1) return jsonError('Database not available in local Vite dev — use wrangler dev', 503);

  try {
    const rows = await db(d1).select().from(hostelServices).orderBy(hostelServices.id);
    return json(rows.map(r => ({ ...r, priceEur: centsToEur(r.priceCents) })));
  } catch (e) {
    console.error('[admin/services GET]', e);
    return jsonError('Failed to load services', 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const deny = requireAdmin(locals);
  if (deny) return deny;

  const d1 = await getD1();
  if (!d1) return jsonError('Database not available in local Vite dev — use wrangler dev', 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonError('Invalid JSON body');
  }

  const { name, description, icon, priceEur, unit, available, category } = body as {
    name?: string; description?: string; icon?: string;
    priceEur?: number; unit?: string; available?: boolean; category?: string;
  };

  if (!name?.trim()) return jsonError('name is required');

  try {
    const inserted = await db(d1)
      .insert(hostelServices)
      .values({
        name:        name.trim(),
        description: description ?? null,
        icon:        icon        ?? '🏨',
        priceCents:  eurToCents(priceEur ?? 0),
        unit:        unit        ?? 'por uso',
        available:   available === false ? 0 : 1,
        category:    category   ?? 'general',
        updatedAt:   sql`(datetime('now'))` as unknown as string,
      })
      .returning();

    return json({ ...inserted[0], priceEur: centsToEur(inserted[0].priceCents) }, 201);
  } catch (e) {
    console.error('[admin/services POST]', e);
    return jsonError('Failed to create service', 500);
  }
};
