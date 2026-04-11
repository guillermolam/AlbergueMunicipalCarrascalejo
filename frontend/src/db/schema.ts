/**
 * Drizzle ORM schema — mirrors the D1 SQLite tables defined in the
 * backend/api-service/migrations/*.sql files.
 *
 * Single source of truth for TypeScript types across all SSR API routes.
 * Do NOT duplicate column definitions here; keep them in sync with the SQL.
 *
 * Monetary values: stored as INTEGER cents (€8.00 → 800).
 * Booleans:        stored as INTEGER 0/1 (SQLite has no native BOOLEAN).
 */

import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ── Admin-configurable tables (migration 0002) ────────────────────────────────

export const dormitories = sqliteTable('dormitories', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  name:      text('name').notNull(),
  roomType:  text('room_type').notNull().default('dormitory'),
  bedsCount: integer('beds_count').notNull().default(12),
  active:    integer('active').notNull().default(1),      // 0 | 1
  notes:     text('notes'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const pricingRules = sqliteTable('pricing_rules', {
  id:                integer('id').primaryKey({ autoIncrement: true }),
  accommodationType: text('accommodation_type').notNull().default('dormitory'),
  priceCents:        integer('price_cents').notNull().default(1500),
  currency:          text('currency').notNull().default('EUR'),
  validFrom:         text('valid_from'),
  validUntil:        text('valid_until'),
  label:             text('label'),
  active:            integer('active').notNull().default(1),
  createdAt:         text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt:         text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const hostelServices = sqliteTable('hostel_services', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  name:        text('name').notNull(),
  description: text('description'),
  icon:        text('icon').notNull().default('🏨'),
  priceCents:  integer('price_cents').notNull().default(0),
  unit:        text('unit').notNull().default('por uso'),
  available:   integer('available').notNull().default(1),
  category:    text('category').notNull().default('general'),
  createdAt:   text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt:   text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const hostelConfig = sqliteTable('hostel_config', {
  id:               integer('id').primaryKey().default(1),
  name:             text('name').notNull().default('Albergue Municipal de El Carrascalejo'),
  tagline:          text('tagline'),
  addressStreet:    text('address_street'),
  addressPostcode:  text('address_postcode'),
  addressTown:      text('address_town'),
  addressProvince:  text('address_province'),
  addressCountry:   text('address_country'),
  phone:            text('phone'),
  email:            text('email'),
  website:          text('website'),
  latitude:         real('latitude'),
  longitude:        real('longitude'),
  checkInTime:      text('check_in_time'),
  checkOutTime:     text('check_out_time'),
  receptionHours:   text('reception_hours'),
  cif:              text('cif'),
  tourismLicense:   text('tourism_license'),
  insurancePolicy:  text('insurance_policy'),
  updatedAt:        text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ── Core operational tables (migration 0001) ──────────────────────────────────

export const bookings = sqliteTable('bookings', {
  id:              text('id').primaryKey(),
  pilgrimId:       integer('pilgrim_id'),
  guestName:       text('guest_name'),
  guestEmail:      text('guest_email'),
  guestPhone:      text('guest_phone'),
  roomType:        text('room_type').notNull().default('dormitory'),
  checkIn:         text('check_in').notNull(),
  checkOut:        text('check_out'),
  numGuests:       integer('num_guests').notNull().default(1),
  totalPrice:      integer('total_price').notNull().default(800),
  status:          text('status').default('pending'),
  paymentStatus:   text('payment_status').default('unpaid'),
  specialRequests: text('special_requests'),
  createdAt:       text('created_at').default(sql`(datetime('now'))`),
  updatedAt:       text('updated_at').default(sql`(datetime('now'))`),
});

export const beds = sqliteTable('beds', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  roomNumber:    text('room_number').notNull(),
  bedNumber:     integer('bed_number').notNull(),
  roomType:      text('room_type').notNull().default('dormitory'),
  status:        text('status').notNull().default('available'),
  pricePerNight: integer('price_per_night').notNull().default(800),
  createdAt:     text('created_at').default(sql`(datetime('now'))`),
});

export const pricing = sqliteTable('pricing', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  accommodationType: text('accommodation_type').notNull(),
  pricePerNight:    integer('price_per_night').notNull(),
  currency:         text('currency').default('EUR'),
  validFrom:        text('valid_from').default(sql`(date('now'))`),
  validUntil:       text('valid_until'),
  createdAt:        text('created_at').default(sql`(datetime('now'))`),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type Dormitory    = typeof dormitories.$inferSelect;
export type NewDormitory = typeof dormitories.$inferInsert;
export type PricingRule    = typeof pricingRules.$inferSelect;
export type NewPricingRule = typeof pricingRules.$inferInsert;
export type HostelService    = typeof hostelServices.$inferSelect;
export type NewHostelService = typeof hostelServices.$inferInsert;
export type HostelConfig    = typeof hostelConfig.$inferSelect;
export type NewHostelConfig = typeof hostelConfig.$inferInsert;
export type Booking    = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
