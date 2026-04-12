/**
 * GET  /api/admin/pricing-rules  — list all pricing rules
 * POST /api/admin/pricing-rules  — create a new rule
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
} from '../../../db/helpers';

export const GET: APIRoute = async ({ locals }) => {
  const deny = requireAdmin(locals);
  if (deny) return deny;

  const d1 = await getD1();
  if (!d1)
    return jsonError(
      'Database not available in local Vite dev — use wrangler dev or the backend api-service',
      503
    );

  try {
    const rules = await db(d1).select().from(pricingRules).orderBy(pricingRules.id);
    return json(rules.map((r) => ({ ...r, priceEur: centsToEur(r.priceCents) })));
  } catch (e) {
    console.error('[admin/pricing-rules GET]', e);
    return jsonError('Failed to load pricing rules', 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const deny = requireAdmin(locals);
  if (deny) return deny;

  const d1 = await getD1();
  if (!d1) return jsonError('Database not available in local Vite dev', 503);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError('Invalid JSON body');
  }

  const { accommodationType, priceEur, validFrom, validUntil, label, active } = body as {
    accommodationType?: string;
    priceEur?: number;
    validFrom?: string;
    validUntil?: string;
    label?: string;
    active?: boolean;
  };

  if (!priceEur || priceEur < 0) return jsonError('priceEur is required and must be ≥ 0');
  if (!accommodationType) return jsonError('accommodationType is required');

  try {
    const inserted = await db(d1)
      .insert(pricingRules)
      .values({
        accommodationType: accommodationType as 'dormitory' | 'private',
        priceCents: eurToCents(priceEur),
        validFrom: validFrom ?? null,
        validUntil: validUntil ?? null,
        label: label ?? null,
        active: active === false ? 0 : 1,
        updatedAt: sql`(datetime('now'))`,
      })
      .returning();

    return json({ ...inserted[0], priceEur: centsToEur(inserted[0].priceCents) }, 201);
  } catch (e) {
    console.error('[admin/pricing-rules POST]', e);
    return jsonError('Failed to create pricing rule', 500);
  }
};
