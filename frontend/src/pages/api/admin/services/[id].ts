/**
 * GET   /api/admin/services/:id  — get a single service
 * PATCH /api/admin/services/:id  — toggle available, update price or description
 * PUT   /api/admin/services/:id  — full replacement update
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { eq, sql } from 'drizzle-orm';
import {
  db,
  getD1,
  requireAdmin,
  json,
  jsonError,
  eurToCents,
  centsToEur,
  hostelServices,
} from '../../../../db/helpers';

function withEur(row: typeof hostelServices.$inferSelect) {
  return { ...row, priceEur: centsToEur(row.priceCents) };
}

export const GET: APIRoute = async ({ params, locals }) => {
  const deny = requireAdmin(locals);
  if (deny) return deny;

  const id = Number(params.id);
  if (!id) return jsonError('Invalid id');

  const d1 = await getD1();
  if (!d1) return jsonError('Database not available in local Vite dev — use wrangler dev', 503);

  try {
    const row = await db(d1).select().from(hostelServices).where(eq(hostelServices.id, id)).get();
    if (!row) return jsonError('Service not found', 404);
    return json(withEur(row));
  } catch (e) {
    console.error('[admin/services/:id GET]', e);
    return jsonError('Failed to load service', 500);
  }
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const deny = requireAdmin(locals);
  if (deny) return deny;

  const id = Number(params.id);
  if (!id) return jsonError('Invalid id');

  const d1 = await getD1();
  if (!d1) return jsonError('Database not available in local Vite dev — use wrangler dev', 503);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError('Invalid JSON body');
  }

  const updates: Partial<typeof hostelServices.$inferInsert> = {
    updatedAt: sql`(datetime('now'))` as unknown as string,
  };

  const { available, priceEur, description, name, icon, unit, category } = body as {
    available?: boolean;
    priceEur?: number;
    description?: string | null;
    name?: string;
    icon?: string;
    unit?: string;
    category?: string;
  };

  if (available !== undefined) updates.available = available ? 1 : 0;
  if (priceEur !== undefined) updates.priceCents = eurToCents(priceEur);
  if (description !== undefined) updates.description = description ?? null;
  if (name !== undefined) updates.name = name;
  if (icon !== undefined) updates.icon = icon;
  if (unit !== undefined) updates.unit = unit;
  if (category !== undefined) updates.category = category;

  try {
    const rows = await db(d1)
      .update(hostelServices)
      .set(updates)
      .where(eq(hostelServices.id, id))
      .returning();

    if (!rows.length) return jsonError('Service not found', 404);
    return json(withEur(rows[0]));
  } catch (e) {
    console.error('[admin/services/:id PATCH]', e);
    return jsonError('Failed to update service', 500);
  }
};

// Alias PUT → PATCH for convenience
export const PUT = PATCH;
