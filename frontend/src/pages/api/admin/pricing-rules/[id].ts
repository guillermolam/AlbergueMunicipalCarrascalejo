/**
 * PUT    /api/admin/pricing-rules/:id  — update a rule
 * DELETE /api/admin/pricing-rules/:id  — delete a rule
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
  pricingRules,
} from '../../../../db/helpers';

export const PUT: APIRoute = async ({ params, request, locals }) => {
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

  const updates: Partial<typeof pricingRules.$inferInsert> = {
    updatedAt: sql`(datetime('now'))` as unknown as string,
  };

  const { accommodationType, priceEur, validFrom, validUntil, label, active } = body as {
    accommodationType?: string;
    priceEur?: number;
    validFrom?: string | null;
    validUntil?: string | null;
    label?: string | null;
    active?: boolean;
  };

  if (accommodationType !== undefined)
    updates.accommodationType = accommodationType as 'dormitory' | 'private';
  if (priceEur !== undefined) updates.priceCents = eurToCents(priceEur);
  if (validFrom !== undefined) updates.validFrom = validFrom ?? null;
  if (validUntil !== undefined) updates.validUntil = validUntil ?? null;
  if (label !== undefined) updates.label = label ?? null;
  if (active !== undefined) updates.active = active ? 1 : 0;

  try {
    const rows = await db(d1)
      .update(pricingRules)
      .set(updates)
      .where(eq(pricingRules.id, id))
      .returning();

    if (!rows.length) return jsonError('Pricing rule not found', 404);
    return json({ ...rows[0], priceEur: centsToEur(rows[0].priceCents) });
  } catch (e) {
    console.error('[admin/pricing-rules PUT]', e);
    return jsonError('Failed to update pricing rule', 500);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const deny = requireAdmin(locals);
  if (deny) return deny;

  const id = Number(params.id);
  if (!id) return jsonError('Invalid id');

  // Protect the default standard-rate rule (id=1)
  if (id === 1) return jsonError('Cannot delete the default pricing rule', 409);

  const d1 = await getD1();
  if (!d1) return jsonError('Database not available in local Vite dev — use wrangler dev', 503);

  try {
    const rows = await db(d1).delete(pricingRules).where(eq(pricingRules.id, id)).returning();

    if (!rows.length) return jsonError('Pricing rule not found', 404);
    return json({ deleted: true, id });
  } catch (e) {
    console.error('[admin/pricing-rules DELETE]', e);
    return jsonError('Failed to delete pricing rule', 500);
  }
};
