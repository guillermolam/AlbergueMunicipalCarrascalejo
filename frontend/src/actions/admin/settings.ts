/**
 * Admin settings Astro actions — use Drizzle D1 directly.
 *
 * Previously these POSTed to the Rust api-service backend over HTTP.
 * Now they query the D1 database directly from the SSR Worker, removing
 * a network hop and the missing-endpoint problem.
 *
 * All actions require `role === 'admin'` (enforced via assertAdmin).
 */

import { defineAction, type ActionAPIContext } from 'astro:actions';
import { z } from 'astro/zod'
import { eq, sql } from 'drizzle-orm';
import {
  db,
  getD1,
  eurToCents,
  centsToEur,
  pricingRules,
  dormitories,
  hostelServices,
  hostelConfig,
} from '../../db/helpers';

// ── Auth guard ────────────────────────────────────────────────────────────────

function assertAdmin(context: ActionAPIContext): void {
  const locals = context.locals;
  if (!locals.sessionToken || locals.role !== 'admin') {
    throw new Error('Unauthorized: admin role required');
  }
}

async function getDb(context: ActionAPIContext) {
  assertAdmin(context);
  const d1 = await getD1();
  if (!d1) throw new Error('D1 database binding is not available in this runtime.');
  return db(d1);
}

const now = () => sql`(datetime('now'))`;

// ── Actions ───────────────────────────────────────────────────────────────────

export const adminSettings = {
  /**
   * Upsert a pricing rule.
   * Creates a new rule if id is omitted; updates existing if id is provided.
   */
  upsertPricingRule: defineAction({
    input: z.object({
      id: z.number().int().positive().optional(),
      accommodationType: z.enum(['dormitory', 'private']).default('dormitory'),
      priceEur: z.number().min(0).max(500),
      validFrom: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .nullable(),
      validUntil: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .nullable(),
      label: z.string().max(100).optional().nullable(),
      active: z.boolean().default(true),
    }),
    handler: async (input, context) => {
      const database = await getDb(context);
      const priceCents = eurToCents(input.priceEur);

      if (input.id) {
        const rows = await database
          .update(pricingRules)
          .set({
            accommodationType: input.accommodationType,
            priceCents,
            validFrom: input.validFrom ?? null,
            validUntil: input.validUntil ?? null,
            label: input.label ?? null,
            active: input.active ? 1 : 0,
            updatedAt: now() as unknown as string,
          })
          .where(eq(pricingRules.id, input.id))
          .returning();
        if (!rows.length) throw new Error('Pricing rule not found');
        return { ...rows[0], priceEur: centsToEur(rows[0].priceCents) };
      }

      const rows = await database
        .insert(pricingRules)
        .values({
          accommodationType: input.accommodationType,
          priceCents,
          validFrom: input.validFrom ?? null,
          validUntil: input.validUntil ?? null,
          label: input.label ?? null,
          active: input.active ? 1 : 0,
          updatedAt: now() as unknown as string,
        })
        .returning();
      return { ...rows[0], priceEur: centsToEur(rows[0].priceCents) };
    },
  }),

  /** Toggle available / update price + description on a hostel service. */
  updateService: defineAction({
    input: z.object({
      id: z.number().int().positive(),
      priceEur: z.number().min(0).max(200).optional(),
      available: z.boolean().optional(),
      description: z.string().max(200).optional().nullable(),
    }),
    handler: async (input, context) => {
      const database = await getDb(context);

      const updates: Partial<typeof hostelServices.$inferInsert> = {
        updatedAt: now() as unknown as string,
      };
      if (input.priceEur !== undefined) updates.priceCents = eurToCents(input.priceEur);
      if (input.available !== undefined) updates.available = input.available ? 1 : 0;
      if (input.description !== undefined) updates.description = input.description ?? null;

      const rows = await database
        .update(hostelServices)
        .set(updates)
        .where(eq(hostelServices.id, input.id))
        .returning();
      if (!rows.length) throw new Error('Service not found');
      return { ...rows[0], priceEur: centsToEur(rows[0].priceCents) };
    },
  }),

  /** Update check-in / check-out / reception hours in hostel_config. */
  updateSchedule: defineAction({
    input: z.object({
      checkInTime: z.string().regex(/^\d{2}:\d{2}$/),
      checkOutTime: z.string().regex(/^\d{2}:\d{2}$/),
      receptionHours: z.string().max(30),
    }),
    handler: async (input, context) => {
      const database = await getDb(context);
      const set = { ...input, updatedAt: now() as unknown as string };
      await database
        .insert(hostelConfig)
        .values({ id: 1, name: 'Albergue Municipal de El Carrascalejo', ...set })
        .onConflictDoUpdate({ target: hostelConfig.id, set });
      return { success: true };
    },
  }),

  /** Update dormitory bed count, active flag, or notes. */
  updateDormitory: defineAction({
    input: z.object({
      id: z.number().int().positive(),
      bedsCount: z.number().int().min(1).max(100).optional(),
      active: z.boolean().optional(),
      notes: z.string().max(255).optional().nullable(),
    }),
    handler: async (input, context) => {
      const database = await getDb(context);

      const updates: Partial<typeof dormitories.$inferInsert> = {
        updatedAt: now() as unknown as string,
      };
      if (input.bedsCount !== undefined) updates.bedsCount = input.bedsCount;
      if (input.active !== undefined) updates.active = input.active ? 1 : 0;
      if (input.notes !== undefined) updates.notes = input.notes ?? null;

      const rows = await database
        .update(dormitories)
        .set(updates)
        .where(eq(dormitories.id, input.id))
        .returning();
      if (!rows.length) throw new Error('Dormitory not found');
      return rows[0];
    },
  }),

  /** Update hostel identity / address / contact / legal info. */
  updateHostelInfo: defineAction({
    input: z.object({
      name: z.string().min(2).max(120).optional(),
      tagline: z.string().max(120).optional().nullable(),
      addressStreet: z.string().max(120).optional().nullable(),
      addressPostcode: z.string().max(10).optional().nullable(),
      addressTown: z.string().max(80).optional().nullable(),
      addressProvince: z.string().max(80).optional().nullable(),
      addressCountry: z.string().max(80).optional().nullable(),
      phone: z.string().max(20).optional().nullable(),
      email: z.string().email().optional().nullable(),
      website: z.string().url().optional().nullable(),
      latitude: z.number().min(-90).max(90).optional().nullable(),
      longitude: z.number().min(-180).max(180).optional().nullable(),
      cif: z.string().max(20).optional().nullable(),
      tourismLicense: z.string().max(40).optional().nullable(),
      insurancePolicy: z.string().max(40).optional().nullable(),
    }),
    handler: async (input, context) => {
      const database = await getDb(context);
      const set = { ...input, updatedAt: now() as unknown as string };
      await database
        .insert(hostelConfig)
        .values({ id: 1, name: input.name ?? 'Albergue Municipal de El Carrascalejo', ...set })
        .onConflictDoUpdate({ target: hostelConfig.id, set });
      return database.select().from(hostelConfig).where(eq(hostelConfig.id, 1)).get();
    },
  }),
};
