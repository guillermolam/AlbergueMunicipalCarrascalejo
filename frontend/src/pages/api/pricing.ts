/**
 * GET /api/pricing
 * Public endpoint — returns the current dormitory night price.
 * Falls back to 15 EUR when D1 is unavailable (local Vite dev).
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { getD1, db, pricingRules, json } from '../../db/helpers';
import { eq, and } from 'drizzle-orm';

const DEFAULT_PRICE_CENTS = 1500; // €15 fallback

export const GET: APIRoute = async () => {
  const d1 = await getD1();

  if (!d1) {
    // Local Vite dev without wrangler — return the known default
    return json({
      accommodation_type: 'dormitory',
      price_cents: DEFAULT_PRICE_CENTS,
      price_eur: DEFAULT_PRICE_CENTS / 100,
      currency: 'EUR',
      source: 'default',
    });
  }

  try {
    const rows = await db(d1)
      .select()
      .from(pricingRules)
      .where(and(eq(pricingRules.accommodationType, 'dormitory'), eq(pricingRules.active, 1)))
      .limit(1);

    const rule = rows[0];
    const priceCents = rule?.priceCents ?? DEFAULT_PRICE_CENTS;

    return json({
      accommodation_type: 'dormitory',
      price_cents: priceCents,
      price_eur: priceCents / 100,
      currency: 'EUR',
      source: 'd1',
    });
  } catch (e) {
    console.error('[/api/pricing GET]', e);
    return json({
      accommodation_type: 'dormitory',
      price_cents: DEFAULT_PRICE_CENTS,
      price_eur: DEFAULT_PRICE_CENTS / 100,
      currency: 'EUR',
      source: 'fallback',
    });
  }
};
