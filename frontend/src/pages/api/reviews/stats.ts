/**
 * GET /api/reviews/stats?source=all|booking|google
 *
 * Returns aggregated review scores from D1 review_scores table.
 * Falls back to reviews-service worker, then hardcoded Booking.com seed values.
 *
 * Response: { source, overall, staff, cleanliness, comfort, valueForMoney,
 *             facilities, location, totalCount, label, lastSynced }
 */
import type { APIRoute } from 'astro';
import { getD1, db, reviewScores } from '../../../db/helpers';
import { eq } from 'drizzle-orm';

export const prerender = false;

const BOOKING_FALLBACK = {
  source: 'booking',
  overall: 9.1,
  staff: 9.6,
  cleanliness: 9.4,
  comfort: 9.3,
  valueForMoney: 9.6,
  facilities: 9.0,
  location: 9.0,
  totalCount: 71,
  label: 'Sobresaliente',
  lastSynced: '2026-04-12T00:00:00Z',
};

export const GET: APIRoute = async ({ url }) => {
  const source = url.searchParams.get('source') ?? 'all';
  const lookupSource = source === 'all' ? 'all' : source;

  // ── 1. Try D1 ───────────────────────────────────────────────────────────────
  const d1 = await getD1();
  if (d1) {
    try {
      const drizzle = db(d1);
      const [row] = await drizzle
        .select()
        .from(reviewScores)
        .where(eq(reviewScores.source, lookupSource))
        .limit(1);
      if (row) {
        return new Response(JSON.stringify({ ...row, dataSource: 'd1' }), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
        });
      }
    } catch (e) {
      console.error('[/api/reviews/stats] D1 error', e);
    }
  }

  // ── 2. Proxy to reviews-service worker ──────────────────────────────────────
  const reviewsBase = import.meta.env.REVIEWS_SERVICE_URL ?? import.meta.env.PUBLIC_API_URL;
  if (reviewsBase) {
    try {
      const upstream = await fetch(`${reviewsBase}/reviews/stats`);
      if (upstream.ok) {
        const data = (await upstream.json()) as unknown;
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
        });
      }
    } catch (e) {
      console.warn('[/api/reviews/stats] reviews-service proxy failed', e);
    }
  }

  // ── 3. Hardcoded Booking.com seed ────────────────────────────────────────────
  return new Response(JSON.stringify({ ...BOOKING_FALLBACK, dataSource: 'default' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
