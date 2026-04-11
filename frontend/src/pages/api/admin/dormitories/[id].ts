/**
 * GET    /api/admin/dormitories/:id  — get single dormitory
 * PUT    /api/admin/dormitories/:id  — update bed count, active state, notes
 * DELETE /api/admin/dormitories/:id  — remove (only if no active bookings)
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { eq, sql } from 'drizzle-orm';
import { db, getD1, requireAdmin, json, jsonError, dormitories } from '../../../../db/helpers';

export const GET: APIRoute = async ({ params, locals }) => {
  const deny = requireAdmin(locals);
  if (deny) return deny;

  const id = Number(params.id);
  if (!id) return jsonError('Invalid id');

  const d1 = await getD1();
  if (!d1) return jsonError('Database not available in local Vite dev — use wrangler dev', 503);

  try {
    const row = await db(d1).select().from(dormitories).where(eq(dormitories.id, id)).get();
    if (!row) return jsonError('Dormitory not found', 404);
    return json(row);
  } catch (e) {
    console.error('[admin/dormitories/:id GET]', e);
    return jsonError('Failed to load dormitory', 500);
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const deny = requireAdmin(locals);
  if (deny) return deny;

  const id = Number(params.id);
  if (!id) return jsonError('Invalid id');

  const d1 = await getD1();
  if (!d1) return jsonError('Database not available in local Vite dev — use wrangler dev', 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonError('Invalid JSON body');
  }

  const updates: Partial<typeof dormitories.$inferInsert> = {
    updatedAt: sql`(datetime('now'))` as unknown as string,
  };

  const { name, bedsCount, active, notes, roomType } = body as {
    name?: string; bedsCount?: number; active?: boolean;
    notes?: string | null; roomType?: string;
  };

  if (name      !== undefined) updates.name      = name.trim();
  if (bedsCount !== undefined) {
    if (bedsCount < 1) return jsonError('bedsCount must be ≥ 1');
    updates.bedsCount = bedsCount;
  }
  if (active   !== undefined) updates.active   = active ? 1 : 0;
  if (notes    !== undefined) updates.notes    = notes ?? null;
  if (roomType !== undefined) updates.roomType = roomType as 'dormitory' | 'private';

  try {
    const rows = await db(d1)
      .update(dormitories)
      .set(updates)
      .where(eq(dormitories.id, id))
      .returning();

    if (!rows.length) return jsonError('Dormitory not found', 404);
    return json(rows[0]);
  } catch (e) {
    console.error('[admin/dormitories/:id PUT]', e);
    return jsonError('Failed to update dormitory', 500);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const deny = requireAdmin(locals);
  if (deny) return deny;

  const id = Number(params.id);
  if (!id) return jsonError('Invalid id');

  const d1 = await getD1();
  if (!d1) return jsonError('Database not available in local Vite dev — use wrangler dev', 503);

  try {
    const rows = await db(d1)
      .delete(dormitories)
      .where(eq(dormitories.id, id))
      .returning();

    if (!rows.length) return jsonError('Dormitory not found', 404);
    return json({ deleted: true, id });
  } catch (e) {
    console.error('[admin/dormitories/:id DELETE]', e);
    return jsonError('Failed to delete dormitory', 500);
  }
};
