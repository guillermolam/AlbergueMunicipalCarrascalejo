/**
 * GET /api/admin/hostel-config  — fetch the single hostel config row
 * PUT /api/admin/hostel-config  — update hostel identity / schedule / legal info
 *
 * The hostel_config table always has exactly one row (id = 1).
 * An upsert is used so the route is idempotent even if the seed hasn't run.
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { eq, sql } from 'drizzle-orm';
import { db, getD1, requireAdmin, json, jsonError, hostelConfig } from '../../../db/helpers';

export const GET: APIRoute = async ({ locals }) => {
  const deny = requireAdmin(locals);
  if (deny) return deny;

  const d1 = await getD1();
  if (!d1) return jsonError('Database not available in local Vite dev — use wrangler dev', 503);

  try {
    const row = await db(d1).select().from(hostelConfig).where(eq(hostelConfig.id, 1)).get();
    if (!row) return jsonError('Hostel config not found — run migrations + seed', 404);
    return json(row);
  } catch (e) {
    console.error('[admin/hostel-config GET]', e);
    return jsonError('Failed to load hostel config', 500);
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
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

  // Build partial update — only include keys present in the request body
  const allowed: Array<keyof typeof hostelConfig.$inferInsert> = [
    'name',
    'tagline',
    'addressStreet',
    'addressPostcode',
    'addressTown',
    'addressProvince',
    'addressCountry',
    'phone',
    'email',
    'website',
    'latitude',
    'longitude',
    'checkInTime',
    'checkOutTime',
    'receptionHours',
    'cif',
    'tourismLicense',
    'insurancePolicy',
  ];

  const updates: Partial<typeof hostelConfig.$inferInsert> = {
    updatedAt: sql`(datetime('now'))` as unknown as string,
  };

  for (const key of allowed) {
    if (key in body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[key] = body[key] ?? null;
    }
  }

  if (Object.keys(updates).length === 1) {
    return jsonError('No valid fields to update');
  }

  try {
    // Upsert: insert if missing, otherwise update
    await db(d1)
      .insert(hostelConfig)
      .values({ id: 1, name: 'Albergue Municipal de El Carrascalejo', ...updates })
      .onConflictDoUpdate({ target: hostelConfig.id, set: updates });

    const row = await db(d1).select().from(hostelConfig).where(eq(hostelConfig.id, 1)).get();
    return json(row);
  } catch (e) {
    console.error('[admin/hostel-config PUT]', e);
    return jsonError('Failed to update hostel config', 500);
  }
};
