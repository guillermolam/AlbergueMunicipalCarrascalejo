/**
 * GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns per-day bed availability and price for the booking calendar widget.
 * Response: { days: { "2026-04-12": { beds: 18, price: 15.0 } } }
 *
 * Data resolution order (no hardcoded formula anywhere):
 *   1. Cloudflare D1 (available in CF Workers / wrangler pages dev)
 *   2. Backend CF Worker at PUBLIC_API_URL (proxy)
 *   3. Honest config-based defaults (€15, full capacity, 0 occupied)
 *      — clearly marked with source: "default" so callers can show a notice
 */
import type { APIRoute } from 'astro';
import { getD1, db } from '../../db/helpers';
import { pricingRules, hostelConfig } from '../../db/schema';
import { and, lte, gte, eq } from 'drizzle-orm';

export const prerender = false;

const DEFAULT_PRICE_CENTS = 1500; // €15.00 — matches hostel_config default
const DEFAULT_TOTAL_BEDS = 24; // 2 dorms × 6 bunks × 2 beds

/** Advance a YYYY-MM-DD string by one day. */
function nextDay(d: string): string {
  const dt = new Date(d + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

/** Build the days map using values already resolved from the DB or config. */
function buildDays(
  from: string,
  to: string,
  occupiedByNight: Map<string, number>,
  priceByCents: (day: string) => number,
  totalBeds: number
): Record<string, { beds: number; price: number }> {
  const days: Record<string, { beds: number; price: number }> = {};
  let cur = from;
  while (cur <= to) {
    const occupied = occupiedByNight.get(cur) ?? 0;
    const available = Math.max(0, totalBeds - occupied);
    days[cur] = { beds: available, price: priceByCents(cur) / 100 };
    cur = nextDay(cur);
  }
  return days;
}

export const GET: APIRoute = async ({ url }) => {
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return new Response(
      JSON.stringify({ error: '`from` and `to` are required YYYY-MM-DD params, from ≤ to' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 1. Try D1 (Cloudflare Workers runtime) ─────────────────────────────────
  const d1 = await getD1();
  if (d1) {
    try {
      const drizzle = db(d1);

      // Hostel config: total beds and default price
      const [config] = await drizzle
        .select()
        .from(hostelConfig)
        .where(eq(hostelConfig.id, 1))
        .limit(1);

      // All active pricing rules that overlap [from, to], highest priority first
      const rules = await drizzle
        .select()
        .from(pricingRules)
        .where(
          and(
            eq(pricingRules.active, 1),
            lte(pricingRules.validFrom, to),
            gte(pricingRules.validUntil, from)
          )
        )
        // Higher price_cents = higher-specificity seasonal rules win over base rate
        .orderBy(pricingRules.priceCents);

      // Active beds count from dormitories
      const bedsRow = await d1
        .prepare('SELECT COALESCE(SUM(beds_count), 0) AS total FROM dormitories WHERE active = 1')
        .first<{ total: number }>();
      const totalBeds = bedsRow?.total ?? DEFAULT_TOTAL_BEDS;

      // Occupied beds per night from booking_beds (v2 schema) or legacy bookings
      const occupiedByNight = new Map<string, number>();
      try {
        const bbRows = await d1
          .prepare(
            `SELECT bb.night_date, COUNT(DISTINCT bb.bed_id) AS occupied
             FROM booking_beds bb
             JOIN bookings b ON b.id = bb.booking_id
             WHERE bb.night_date >= ? AND bb.night_date <= ?
               AND b.status NOT IN ('cancelled','reimbursed','expired','no_show')
             GROUP BY bb.night_date`
          )
          .bind(from, to)
          .all<{ night_date: string; occupied: number }>();
        for (const row of bbRows.results ?? []) {
          occupiedByNight.set(row.night_date, row.occupied);
        }
      } catch {
        // Fallback to legacy bookings table column names
        const legacyRows = await d1
          .prepare(
            `SELECT check_in, check_out, num_guests FROM bookings
             WHERE status NOT IN ('cancelled','reimbursed','expired','no_show')
               AND check_in <= ? AND check_out >= ?`
          )
          .bind(to, from)
          .all<{ check_in: string; check_out: string; num_guests: number }>();
        for (const b of legacyRows.results ?? []) {
          let cur = b.check_in;
          while (cur < b.check_out && cur >= from && cur <= to) {
            occupiedByNight.set(cur, (occupiedByNight.get(cur) ?? 0) + (b.num_guests ?? 1));
            cur = nextDay(cur);
          }
        }
      }

      const defaultCents = DEFAULT_PRICE_CENTS;

      const priceFn = (day: string): number => {
        const rule = rules.find(
          (r) => (r.validFrom ?? '') <= day && (r.validUntil ?? '9999') >= day
        );
        return rule?.priceCents ?? defaultCents;
      };

      const days = buildDays(from, to, occupiedByNight, priceFn, totalBeds);
      return new Response(JSON.stringify({ days, source: 'd1' }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    } catch (e) {
      console.error('[/api/availability] D1 error', e);
      // Fall through to proxy
    }
  }

  // ── 2. Proxy to backend CF Worker ──────────────────────────────────────────
  const apiBase = import.meta.env.PUBLIC_API_URL;
  if (apiBase) {
    try {
      const upstream = await fetch(`${apiBase}/api/availability?from=${from}&to=${to}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (upstream.ok) {
        const data = (await upstream.json()) as unknown;
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
        });
      }
    } catch (e) {
      console.warn('[/api/availability] backend proxy failed', e);
    }
  }

  // ── 3. Honest config-based defaults ────────────────────────────────────────
  // No formula. Price = €15 (hostel default). Beds = full capacity.
  // Occupancy = 0 (we have no data). source field tells the UI this is a default.
  const days = buildDays(from, to, new Map(), () => DEFAULT_PRICE_CENTS, DEFAULT_TOTAL_BEDS);
  return new Response(JSON.stringify({ days, source: 'default' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
