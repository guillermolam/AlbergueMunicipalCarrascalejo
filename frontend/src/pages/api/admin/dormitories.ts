/**
 * GET  /api/admin/dormitories  — list all dormitories
 * POST /api/admin/dormitories  — add a new dormitory
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { db, getD1, requireAdmin, json, jsonError, dormitories } from '../../../db/helpers';

export const GET: APIRoute = async ({ locals }) => {
  const deny = requireAdmin(locals);
  if (deny) return deny;

  const d1 = await getD1();
  if (!d1) return jsonError('Database not available in local Vite dev — use wrangler dev', 503);

  try {
    const rows = await db(d1).select().from(dormitories).orderBy(dormitories.id);
    return json(rows);
  } catch (e) {
    console.error('[admin/dormitories GET]', e);
    return jsonError('Failed to load dormitories', 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const deny = requireAdmin(locals);
  if (deny) return deny;

  const d1 = await getD1();
  if (!d1) return jsonError('Database not available in local Vite dev — use wrangler dev', 503);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError('Invalid JSON body');
  }

  const { name, roomType, bedsCount, active, notes } = body as {
    name?: string;
    roomType?: string;
    bedsCount?: number;
    active?: boolean;
    notes?: string;
  };

  if (!name?.trim()) return jsonError('name is required');
  if (!bedsCount || bedsCount < 1) return jsonError('bedsCount must be ≥ 1');

  try {
    const inserted = await db(d1)
      .insert(dormitories)
      .values({
        name: name.trim(),
        roomType: (roomType ?? 'dormitory') as 'dormitory' | 'private',
        bedsCount: bedsCount,
        active: active === false ? 0 : 1,
        notes: notes ?? null,
        updatedAt: sql`(datetime('now'))` as unknown as string,
      })
      .returning();

    return json(inserted[0], 201);
  } catch (e) {
    console.error('[admin/dormitories POST]', e);
    return jsonError('Failed to create dormitory', 500);
  }
};
