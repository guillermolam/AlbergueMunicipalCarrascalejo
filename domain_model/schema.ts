/**
 * Albergue Municipal Carrascalejo — Drizzle ORM Schema
 *
 * Design principles:
 * - Business logic lives in middleware / service layer, never here.
 * - Each Cloudflare Worker is stateless; shared state lives in the DB.
 * - Race conditions on bed allocation are prevented at the DB level via a
 *   UNIQUE constraint on (bed_id, night_date) in booking_beds plus an
 *   optimistic-lock `version` column on bookings.
 * - Prices are stored in integer euro-cents to avoid floating-point errors.
 * - Personally-Identifiable Information (PII) fields are encrypted at the
 *   application layer before being written to the database.
 * - Clerk is the identity provider; `clerk_user_id` is the FK from the DB
 *   into Clerk's system.  All authentication state lives in Clerk.
 */

import {
  pgTable,
  pgEnum,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const dormTypeEnum = pgEnum("dorm_type", ["mixed", "male", "female"]);

export const bedPositionEnum = pgEnum("bed_position", [
  "top",
  "bottom",
  "single",
]);

export const bedStatusEnum = pgEnum("bed_status", [
  "available",
  "reserved",
  "occupied",
  "maintenance",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",       // created, beds not yet locked
  "in_progress",   // beds locked, pilgrim filling forms
  "confirmed",     // all guest info submitted, awaiting payment
  "paid",          // payment received
  "checked_in",    // guests physically at hostel
  "checked_out",   // stay completed
  "cancelled",     // cancelled before check-in
  "reimbursed",    // refund issued
  "no_show",       // did not arrive
  "expired",       // in_progress timed out before confirmation
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "card",
  "cash",
  "transfer",
  "stripe",
  "paypal",
  "other",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
  "disputed",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "dni",
  "nie",
  "passport",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "sms",
  "whatsapp",
  "telegram",
  "push",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "delivered",
  "failed",
  "bounced",
]);

export const govSubmissionStatusEnum = pgEnum("gov_submission_status", [
  "pending",
  "submitted",
  "accepted",
  "rejected",
  "error",
]);

export const serviceCategoryEnum = pgEnum("service_category", [
  "food",
  "transport",
  "laundry",
  "storage",
  "activity",
  "wellness",
  "other",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "insert",
  "update",
  "delete",
]);

export const userRoleEnum = pgEnum("user_role", [
  "pilgrim",
  "staff",
  "admin",
]);

// ─────────────────────────────────────────────────────────────────────────────
// HOSTEL CONFIGURATION  (singleton row — id always = 1)
// ─────────────────────────────────────────────────────────────────────────────

export const hostelConfig = pgTable("hostel_config", {
  id: integer("id").primaryKey().default(1),

  // Identity
  hostelName:    text("hostel_name").notNull().default("Albergue Municipal Carrascalejo"),
  legalName:     text("legal_name"),
  taxId:         text("tax_id"),
  legalInfo:     text("legal_info"),          // Markdown / plain text

  // Contact
  email:         text("email").notNull(),
  phone:         text("phone").notNull(),

  // Address
  addressStreet:     text("address_street").notNull(),
  addressCity:       text("address_city").notNull().default("Carrascalejo"),
  addressPostalCode: text("address_postal_code").notNull(),
  addressProvince:   text("address_province").default("Cáceres"),
  addressCountry:    text("address_country").default("ES"),
  latitude:          text("latitude"),
  longitude:         text("longitude"),

  // Operations
  checkInTime:    text("check_in_time").notNull().default("14:00"),   // HH:MM
  checkOutTime:   text("check_out_time").notNull().default("11:00"),  // HH:MM

  // Connectivity
  wifiSsid:       text("wifi_ssid"),
  wifiPassword:   text("wifi_password"),
  wifiNotes:      text("wifi_notes"),

  // Booking rules
  defaultPricePerNightEurCents:  integer("default_price_per_night_eur_cents").notNull().default(1500),  // €15.00
  maxBookingDaysInAdvance:       integer("max_booking_days_in_advance").notNull().default(365),
  maxNightsPerBooking:           integer("max_nights_per_booking").notNull().default(30),
  // maxPeoplePerBooking is derived at runtime from total active bed count,
  // but an absolute override can be stored here (null = use capacity).
  maxPeoplePerBookingOverride:   integer("max_people_per_booking_override"),

  // Lock TTL: how long an in_progress booking holds beds before expiring (minutes)
  bookingLockTtlMinutes: integer("booking_lock_ttl_minutes").notNull().default(30),

  updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────────────────
// BUILDINGS
// ─────────────────────────────────────────────────────────────────────────────

export const buildings = pgTable("buildings", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  description: text("description"),
  address:     text("address"),   // null = same as hostel
  floors:      integer("floors").default(1),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────────────────
// DORMS
// ─────────────────────────────────────────────────────────────────────────────

export const dorms = pgTable("dorms", {
  id:          serial("id").primaryKey(),
  buildingId:  integer("building_id").references(() => buildings.id, { onDelete: "restrict" }),
  name:        text("name").notNull(),
  type:        dormTypeEnum("type").notNull().default("mixed"),
  floor:       integer("floor").default(0),
  description: text("description"),
  amenities:   jsonb("amenities").$type<string[]>().default(sql`'[]'::jsonb`),
  isActive:    boolean("is_active").default(true),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────────────────
// BED BUNKS  (default: 6 per dorm)
// ─────────────────────────────────────────────────────────────────────────────

export const bedBunks = pgTable(
  "bed_bunks",
  {
    id:         serial("id").primaryKey(),
    dormId:     integer("dorm_id").references(() => dorms.id, { onDelete: "cascade" }).notNull(),
    bunkNumber: integer("bunk_number").notNull(),  // sequential within the dorm
    label:      text("label"),                     // e.g. "Bunk A1"
    notes:      text("notes"),
    createdAt:  timestamp("created_at").defaultNow(),
  },
  (t) => [unique("uq_bunk_per_dorm").on(t.dormId, t.bunkNumber)],
);

// ─────────────────────────────────────────────────────────────────────────────
// BEDS  (default: 2 per bunk — top + bottom)
// Each bed is globally unique; bed_number is the hostel-wide identifier
// shown to guests (e.g. "Bed 7").
// ─────────────────────────────────────────────────────────────────────────────

export const beds = pgTable(
  "beds",
  {
    id:         serial("id").primaryKey(),
    bunkId:     integer("bunk_id").references(() => bedBunks.id, { onDelete: "cascade" }).notNull(),
    dormId:     integer("dorm_id").references(() => dorms.id, { onDelete: "cascade" }).notNull(),
    position:   bedPositionEnum("position").notNull(),
    bedNumber:  integer("bed_number").notNull().unique(),  // hostel-wide unique label
    label:      text("label"),                             // e.g. "A1-Top"
    status:     bedStatusEnum("status").notNull().default("available"),
    notes:      text("notes"),
    lastCleanedAt:    timestamp("last_cleaned_at"),
    maintenanceNotes: text("maintenance_notes"),
    createdAt:  timestamp("created_at").defaultNow(),
    updatedAt:  timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
  },
  (t) => [unique("uq_position_per_bunk").on(t.bunkId, t.position)],
);

// ─────────────────────────────────────────────────────────────────────────────
// PRICING RULES  (date-range overrides; highest priority wins)
// Falls back to hostelConfig.defaultPricePerNightEurCents when no rule matches.
// ─────────────────────────────────────────────────────────────────────────────

export const pricingRules = pgTable("pricing_rules", {
  id:                      serial("id").primaryKey(),
  // Scope: null = applies to everything at that level
  dormId:                  integer("dorm_id").references(() => dorms.id, { onDelete: "cascade" }),
  bedId:                   integer("bed_id").references(() => beds.id, { onDelete: "cascade" }),
  validFrom:               date("valid_from").notNull(),
  validTo:                 date("valid_to").notNull(),
  pricePerNightEurCents:   integer("price_per_night_eur_cents").notNull(),
  label:                   text("label"),    // e.g. "Summer 2026"
  priority:                integer("priority").notNull().default(0),
  isActive:                boolean("is_active").default(true),
  createdAt:               timestamp("created_at").defaultNow(),
  updatedAt:               timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────

export const services = pgTable("services", {
  id:           serial("id").primaryKey(),
  name:         text("name").notNull(),
  category:     serviceCategoryEnum("category").notNull().default("other"),
  description:  text("description"),
  priceCents:   integer("price_cents"),     // null = free / included
  currency:     text("currency").default("EUR"),
  isAvailable:  boolean("is_available").default(true),
  sortOrder:    integer("sort_order").default(0),
  createdAt:    timestamp("created_at").defaultNow(),
  updatedAt:    timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

export const serviceImages = pgTable("service_images", {
  id:        serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id, { onDelete: "cascade" }).notNull(),
  imageUrl:  text("image_url").notNull(),
  altText:   text("alt_text"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// STAFF
// ─────────────────────────────────────────────────────────────────────────────

export const staff = pgTable("staff", {
  id:               serial("id").primaryKey(),
  firstName:        text("first_name").notNull(),
  lastName:         text("last_name").notNull(),
  role:             text("role").notNull(),           // e.g. "Hospitalero", "Manager"
  email:            text("email"),
  phone:            text("phone"),
  whatsapp:         text("whatsapp"),
  telegramHandle:   text("telegram_handle"),
  isPublicContact:  boolean("is_public_contact").default(false),
  photoUrl:         text("photo_url"),
  bio:              text("bio"),
  isActive:         boolean("is_active").default(true),
  sortOrder:        integer("sort_order").default(0),
  createdAt:        timestamp("created_at").defaultNow(),
  updatedAt:        timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL NETWORKS
// ─────────────────────────────────────────────────────────────────────────────

export const socialNetworks = pgTable("social_networks", {
  id:             serial("id").primaryKey(),
  platform:       text("platform").notNull(),   // "instagram", "facebook", "x", etc.
  handle:         text("handle"),
  url:            text("url").notNull(),
  followersCount: integer("followers_count"),
  isActive:       boolean("is_active").default(true),
  sortOrder:      integer("sort_order").default(0),
  updatedAt:      timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS  (Clerk-linked; one row per Clerk user)
//
// clerkUserId is the FK into Clerk's identity store.
// Document copies are stored in Cloudflare R2; only the URL is persisted here.
// ─────────────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id:                    serial("id").primaryKey(),
  clerkUserId:           text("clerk_user_id").notNull().unique(),
  email:                 text("email").notNull().unique(),
  phone:                 text("phone"),
  role:                  userRoleEnum("role").notNull().default("pilgrim"),
  // R2 URLs to identity document scans uploaded by the user
  idDocumentUrl:         text("id_document_url"),
  passportDocumentUrl:   text("passport_document_url"),
  createdAt:             timestamp("created_at").defaultNow(),
  updatedAt:             timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────────────────
// PILGRIMS  (one row per physical person in a booking)
//
// PII fields (name, document number, address, phone) are encrypted at the
// application layer (AES-256-GCM) before writing; decryption happens in the
// service layer, never in the DB.  The _encrypted suffix makes this explicit.
// ─────────────────────────────────────────────────────────────────────────────

export const pilgrims = pgTable("pilgrims", {
  id:                     serial("id").primaryKey(),
  // Link to Clerk user if they have an account (walk-in guests may not)
  userId:                 integer("user_id").references(() => users.id, { onDelete: "set null" }),

  // PII — stored encrypted
  firstNameEncrypted:     text("first_name_encrypted").notNull(),
  lastNameEncrypted:      text("last_name_encrypted").notNull(),
  lastName2Encrypted:     text("last_name_2_encrypted"),     // second surname (ES custom)
  dateOfBirthEncrypted:   text("date_of_birth_encrypted").notNull(),
  documentType:           documentTypeEnum("document_type").notNull(),
  documentNumberEncrypted: text("document_number_encrypted").notNull(),
  documentSupportNumber:  text("document_support_number"),   // NIE support number (not encrypted, non-PII)

  // R2 URLs to scans of the physical document
  idDocumentScanUrl:      text("id_document_scan_url"),
  passportScanUrl:        text("passport_scan_url"),

  gender:                 text("gender").notNull(),            // "male" | "female" | "other"
  nationalityCode:        text("nationality_code").notNull(),  // ISO 3166-1 alpha-2

  // Contact — encrypted
  phoneEncrypted:         text("phone_encrypted").notNull(),
  emailEncrypted:         text("email_encrypted"),
  // Structured phone metadata — not PII (country code / dialing code only)
  phoneCode:              text("phone_code"),      // e.g. "+34"
  phoneCountry:           text("phone_country"),   // ISO 3166-1 alpha-2, e.g. "ES"

  // Emergency contacts — encrypted JSON array
  // Stores EmergencyContactEntry[] as AES-256-GCM encrypted JSON text.
  // Supersedes emergency_contact_name_encrypted + emergency_contact_phone_encrypted
  // (those are kept for backward compat / government submissions that need flat fields).
  emergencyContactNameEncrypted:  text("emergency_contact_name_encrypted"),
  emergencyContactPhoneEncrypted: text("emergency_contact_phone_encrypted"),
  emergencyContactsEncrypted:     text("emergency_contacts_encrypted"),

  // Identity documents — encrypted JSON array
  // Stores PilgrimDocument[] (with images array) as AES-256-GCM encrypted JSON text.
  documentsEncrypted:     text("documents_encrypted"),

  // Address — encrypted
  addressStreetEncrypted:     text("address_street_encrypted").notNull(),
  addressLine2Encrypted:      text("address_line2_encrypted"),         // optional second line
  addressCityEncrypted:       text("address_city_encrypted").notNull(),
  addressPostalCode:          text("address_postal_code").notNull(),   // not PII
  addressProvince:            text("address_province"),
  addressCountry:             text("address_country").notNull(),        // ISO 3166-1 alpha-2
  addressMunicipalityCode:    text("address_municipality_code"),

  language:               text("language").default("es"),

  // GDPR compliance
  dataConsentGiven:       boolean("data_consent_given").notNull().default(false),
  dataConsentAt:          timestamp("data_consent_at"),
  dataRetentionUntil:     date("data_retention_until"),  // 3 years after last stay (legal minimum ES)

  createdAt:              timestamp("created_at").defaultNow(),
  updatedAt:              timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOKINGS
//
// Race-condition prevention:
//   1. `version` column for optimistic locking — middleware must check that
//      the version it read is still current before committing any mutation.
//   2. `booking_beds.UNIQUE(bed_id, night_date)` is the hard DB-level guard
//      that prevents two concurrent transactions from assigning the same bed
//      to the same night.
//   3. The booking_lock_ttl_minutes config auto-expires in_progress bookings.
//
// Capacity constraints:
//   - numberOfPeople must be ≤ number of beds assigned (enforced in middleware)
//   - numberOfPeople must be ≤ hostelConfig.maxPeoplePerBookingOverride if set
//     (otherwise ≤ total active bed count)
// ─────────────────────────────────────────────────────────────────────────────

export const bookings = pgTable("bookings", {
  id:               serial("id").primaryKey(),
  referenceNumber:  text("reference_number").notNull().unique(),

  // Primary person — mandatory, always collected even for single-person bookings
  primaryPilgrimId: integer("primary_pilgrim_id")
    .references(() => pilgrims.id, { onDelete: "restrict" })
    .notNull(),

  // Clerk user who initiated the booking (null for walk-in / staff-created)
  userId:           integer("user_id").references(() => users.id, { onDelete: "set null" }),

  checkInDate:      date("check_in_date").notNull(),
  checkOutDate:     date("check_out_date").notNull(),
  numberOfNights:   integer("number_of_nights").notNull(),

  // Must be ≤ beds assigned; validated in middleware before DB write
  numberOfPeople:   integer("number_of_people").notNull().default(1),

  status:           bookingStatusEnum("status").notNull().default("pending"),

  totalAmountCents: integer("total_amount_cents").notNull(),
  currency:         text("currency").notNull().default("EUR"),

  notes:            text("notes"),
  estimatedArrivalTime: text("estimated_arrival_time"),   // HH:MM, optional

  // Optimistic locking — increment on every status transition or bed change
  version:          integer("version").notNull().default(0),

  // Timestamps for key lifecycle events
  locksExpiresAt:   timestamp("locks_expires_at"),   // when in_progress beds lock expires
  confirmedAt:      timestamp("confirmed_at"),
  paidAt:           timestamp("paid_at"),
  cancelledAt:      timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  checkedInAt:      timestamp("checked_in_at"),
  checkedOutAt:     timestamp("checked_out_at"),

  createdAt:        timestamp("created_at").defaultNow(),
  updatedAt:        timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING GUESTS  (additional persons beyond the primary pilgrim)
//
// A booking for N people must have exactly N rows across primary_pilgrim +
// booking_guests.  Middleware validates this before confirming the booking.
// ─────────────────────────────────────────────────────────────────────────────

export const bookingGuests = pgTable(
  "booking_guests",
  {
    id:         serial("id").primaryKey(),
    bookingId:  integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
    pilgrimId:  integer("pilgrim_id").references(() => pilgrims.id, { onDelete: "restrict" }).notNull(),
    sortOrder:  integer("sort_order").default(0),  // display order in forms
    createdAt:  timestamp("created_at").defaultNow(),
  },
  (t) => [unique("uq_guest_per_booking").on(t.bookingId, t.pilgrimId)],
);

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING BEDS  (bed allocation — one row per bed per night)
//
// The UNIQUE(bed_id, night_date) constraint is the singleton guard:
// PostgreSQL will reject a second INSERT for the same (bed, night) even
// under concurrent load, removing the need for application-level mutexes.
//
// Transient lock: while status = in_progress the rows exist but are not
// "confirmed"; if locks_expires_at passes, a cron deletes them and resets
// the booking to "expired".
// ─────────────────────────────────────────────────────────────────────────────

export const bookingBeds = pgTable(
  "booking_beds",
  {
    id:         serial("id").primaryKey(),
    bookingId:  integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
    bedId:      integer("bed_id").references(() => beds.id, { onDelete: "restrict" }).notNull(),
    nightDate:  date("night_date").notNull(),   // the check-in night this row covers
    createdAt:  timestamp("created_at").defaultNow(),
  },
  (t) => [unique("uq_bed_per_night").on(t.bedId, t.nightDate)],
);

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id:               serial("id").primaryKey(),
  bookingId:        integer("booking_id").references(() => bookings.id, { onDelete: "restrict" }).notNull(),
  amountCents:      integer("amount_cents").notNull(),
  currency:         text("currency").notNull().default("EUR"),
  paymentMethod:    paymentMethodEnum("payment_method").notNull(),
  status:           paymentStatusEnum("status").notNull().default("pending"),
  gatewayPaymentId: text("gateway_payment_id"),   // Stripe payment_intent id, etc.
  gatewayResponse:  jsonb("gateway_response"),
  receiptNumber:    text("receipt_number"),
  paidAt:           timestamp("paid_at"),
  refundedAt:       timestamp("refunded_at"),
  refundAmountCents: integer("refund_amount_cents"),
  createdAt:        timestamp("created_at").defaultNow(),
  updatedAt:        timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────────────────
// GOVERNMENT SUBMISSIONS  (Spanish Mossos / SES XML reporting)
// One row per pilgrim per booking (each person must be reported separately).
// ─────────────────────────────────────────────────────────────────────────────

export const governmentSubmissions = pgTable("government_submissions", {
  id:               serial("id").primaryKey(),
  bookingId:        integer("booking_id").references(() => bookings.id, { onDelete: "restrict" }).notNull(),
  pilgrimId:        integer("pilgrim_id").references(() => pilgrims.id, { onDelete: "restrict" }).notNull(),
  xmlContent:       text("xml_content").notNull(),
  submissionStatus: govSubmissionStatusEnum("submission_status").notNull().default("pending"),
  submittedAt:      timestamp("submitted_at"),
  responseData:     jsonb("response_data"),
  attempts:         integer("attempts").notNull().default(0),
  lastAttemptAt:    timestamp("last_attempt_at"),
  createdAt:        timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id:                serial("id").primaryKey(),
  bookingId:         integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  pilgrimId:         integer("pilgrim_id").references(() => pilgrims.id, { onDelete: "set null" }),
  channel:           notificationChannelEnum("channel").notNull(),
  recipient:         text("recipient").notNull(),  // email address, phone number, etc.
  subject:           text("subject"),
  body:              text("body").notNull(),
  status:            notificationStatusEnum("status").notNull().default("pending"),
  providerMessageId: text("provider_message_id"),
  errorMessage:      text("error_message"),
  sentAt:            timestamp("sent_at"),
  createdAt:         timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG  (GDPR / NIS2 compliance)
// ─────────────────────────────────────────────────────────────────────────────

export const auditLog = pgTable("audit_log", {
  id:         serial("id").primaryKey(),
  tableName:  text("table_name").notNull(),
  recordId:   integer("record_id").notNull(),
  action:     auditActionEnum("action").notNull(),
  oldValues:  jsonb("old_values"),
  newValues:  jsonb("new_values"),
  userId:     integer("user_id").references(() => users.id, { onDelete: "set null" }),
  ipAddress:  text("ip_address"),
  userAgent:  text("user_agent"),
  createdAt:  timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const buildingsRelations = relations(buildings, ({ many }) => ({
  dorms: many(dorms),
}));

export const dormsRelations = relations(dorms, ({ one, many }) => ({
  building:  one(buildings, { fields: [dorms.buildingId], references: [buildings.id] }),
  bedBunks:  many(bedBunks),
  beds:      many(beds),
  pricingRules: many(pricingRules),
}));

export const bedBunksRelations = relations(bedBunks, ({ one, many }) => ({
  dorm: one(dorms, { fields: [bedBunks.dormId], references: [dorms.id] }),
  beds: many(beds),
}));

export const bedsRelations = relations(beds, ({ one, many }) => ({
  bunk:         one(bedBunks, { fields: [beds.bunkId], references: [bedBunks.id] }),
  dorm:         one(dorms, { fields: [beds.dormId], references: [dorms.id] }),
  bookingBeds:  many(bookingBeds),
  pricingRules: many(pricingRules),
}));

export const pricingRulesRelations = relations(pricingRules, ({ one }) => ({
  dorm: one(dorms, { fields: [pricingRules.dormId], references: [dorms.id] }),
  bed:  one(beds,  { fields: [pricingRules.bedId],  references: [beds.id] }),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  images: many(serviceImages),
}));

export const serviceImagesRelations = relations(serviceImages, ({ one }) => ({
  service: one(services, { fields: [serviceImages.serviceId], references: [services.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  pilgrim:   one(pilgrims, { fields: [users.id], references: [pilgrims.userId] }),
  bookings:  many(bookings),
  auditLog:  many(auditLog),
}));

export const pilgrimsRelations = relations(pilgrims, ({ one, many }) => ({
  user:           one(users, { fields: [pilgrims.userId], references: [users.id] }),
  bookings:       many(bookings),
  bookingGuests:  many(bookingGuests),
  notifications:  many(notifications),
  govSubmissions: many(governmentSubmissions),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  primaryPilgrim:   one(pilgrims, { fields: [bookings.primaryPilgrimId], references: [pilgrims.id] }),
  user:             one(users,    { fields: [bookings.userId],            references: [users.id] }),
  guests:           many(bookingGuests),
  beds:             many(bookingBeds),
  payments:         many(payments),
  notifications:    many(notifications),
  govSubmissions:   many(governmentSubmissions),
}));

export const bookingGuestsRelations = relations(bookingGuests, ({ one }) => ({
  booking: one(bookings, { fields: [bookingGuests.bookingId], references: [bookings.id] }),
  pilgrim: one(pilgrims, { fields: [bookingGuests.pilgrimId], references: [pilgrims.id] }),
}));

export const bookingBedsRelations = relations(bookingBeds, ({ one }) => ({
  booking: one(bookings, { fields: [bookingBeds.bookingId], references: [bookings.id] }),
  bed:     one(beds,     { fields: [bookingBeds.bedId],     references: [beds.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
}));

export const governmentSubmissionsRelations = relations(governmentSubmissions, ({ one }) => ({
  booking: one(bookings, { fields: [governmentSubmissions.bookingId], references: [bookings.id] }),
  pilgrim: one(pilgrims, { fields: [governmentSubmissions.pilgrimId], references: [pilgrims.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  booking: one(bookings, { fields: [notifications.bookingId], references: [bookings.id] }),
  pilgrim: one(pilgrims, { fields: [notifications.pilgrimId], references: [pilgrims.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, { fields: [auditLog.userId], references: [users.id] }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// ZOD VALIDATION SCHEMAS  (used in middleware / service layer)
// ─────────────────────────────────────────────────────────────────────────────

// Reusable validators
const phoneSchema = z.string().regex(
  /^\+?[1-9]\d{6,14}$/,
  "Phone must be E.164 format, e.g. +34612345678",
);
const emailSchema = z.string().email("Must be a valid email address");
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM");

export const insertHostelConfigSchema = createInsertSchema(hostelConfig, {
  email:     emailSchema,
  phone:     phoneSchema,
  checkInTime:  timeSchema,
  checkOutTime: timeSchema,
});

export const insertBuildingSchema = createInsertSchema(buildings).omit({ id: true, createdAt: true, updatedAt: true });

export const insertDormSchema = createInsertSchema(dorms).omit({ id: true, createdAt: true, updatedAt: true });

export const insertBedBunkSchema = createInsertSchema(bedBunks).omit({ id: true, createdAt: true });

export const insertBedSchema = createInsertSchema(beds).omit({ id: true, createdAt: true, updatedAt: true });

export const insertPricingRuleSchema = createInsertSchema(pricingRules, {
  validFrom: isoDateSchema,
  validTo:   isoDateSchema,
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true, updatedAt: true });

export const insertServiceImageSchema = createInsertSchema(serviceImages).omit({ id: true, createdAt: true });

export const insertStaffSchema = createInsertSchema(staff, {
  email: emailSchema.optional().nullable(),
  phone: phoneSchema.optional().nullable(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSocialNetworkSchema = createInsertSchema(socialNetworks).omit({ id: true, updatedAt: true });

export const insertUserSchema = createInsertSchema(users, {
  email: emailSchema,
  phone: phoneSchema.optional().nullable(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertPilgrimSchema = createInsertSchema(pilgrims, {
  emailEncrypted:  z.string().optional().nullable(),  // already encrypted by app layer before insert
  phoneEncrypted:  z.string(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertBookingSchema = createInsertSchema(bookings, {
  checkInDate:  isoDateSchema,
  checkOutDate: isoDateSchema,
}).omit({ id: true, createdAt: true, updatedAt: true, version: true });

export const insertBookingGuestSchema = createInsertSchema(bookingGuests).omit({ id: true, createdAt: true });

export const insertBookingBedSchema = createInsertSchema(bookingBeds, {
  nightDate: isoDateSchema,
}).omit({ id: true, createdAt: true });

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, updatedAt: true });

export const insertGovernmentSubmissionSchema = createInsertSchema(governmentSubmissions).omit({ id: true, createdAt: true });

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, createdAt: true });

// ─────────────────────────────────────────────────────────────────────────────
// INFERRED TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type HostelConfig            = typeof hostelConfig.$inferSelect;
export type Building                = typeof buildings.$inferSelect;
export type InsertBuilding          = z.infer<typeof insertBuildingSchema>;
export type Dorm                    = typeof dorms.$inferSelect;
export type InsertDorm              = z.infer<typeof insertDormSchema>;
export type BedBunk                 = typeof bedBunks.$inferSelect;
export type InsertBedBunk           = z.infer<typeof insertBedBunkSchema>;
export type Bed                     = typeof beds.$inferSelect;
export type InsertBed               = z.infer<typeof insertBedSchema>;
export type PricingRule             = typeof pricingRules.$inferSelect;
export type InsertPricingRule       = z.infer<typeof insertPricingRuleSchema>;
export type Service                 = typeof services.$inferSelect;
export type InsertService           = z.infer<typeof insertServiceSchema>;
export type ServiceImage            = typeof serviceImages.$inferSelect;
export type InsertServiceImage      = z.infer<typeof insertServiceImageSchema>;
export type Staff                   = typeof staff.$inferSelect;
export type InsertStaff             = z.infer<typeof insertStaffSchema>;
export type SocialNetwork           = typeof socialNetworks.$inferSelect;
export type InsertSocialNetwork     = z.infer<typeof insertSocialNetworkSchema>;
export type User                    = typeof users.$inferSelect;
export type InsertUser              = z.infer<typeof insertUserSchema>;
export type Pilgrim                 = typeof pilgrims.$inferSelect;
export type InsertPilgrim           = z.infer<typeof insertPilgrimSchema>;
export type Booking                 = typeof bookings.$inferSelect;
export type InsertBooking           = z.infer<typeof insertBookingSchema>;
export type BookingGuest            = typeof bookingGuests.$inferSelect;
export type InsertBookingGuest      = z.infer<typeof insertBookingGuestSchema>;
export type BookingBed              = typeof bookingBeds.$inferSelect;
export type InsertBookingBed        = z.infer<typeof insertBookingBedSchema>;
export type Payment                 = typeof payments.$inferSelect;
export type InsertPayment           = z.infer<typeof insertPaymentSchema>;
export type GovernmentSubmission    = typeof governmentSubmissions.$inferSelect;
export type InsertGovernmentSubmission = z.infer<typeof insertGovernmentSubmissionSchema>;
export type Notification            = typeof notifications.$inferSelect;
export type InsertNotification      = z.infer<typeof insertNotificationSchema>;
export type AuditLog                = typeof auditLog.$inferSelect;
export type InsertAuditLog          = z.infer<typeof insertAuditLogSchema>;

// Enum value types for use in application code
export type DormType                = typeof dormTypeEnum.enumValues[number];
export type BedPosition             = typeof bedPositionEnum.enumValues[number];
export type BedStatus               = typeof bedStatusEnum.enumValues[number];
export type BookingStatus           = typeof bookingStatusEnum.enumValues[number];
export type PaymentMethod           = typeof paymentMethodEnum.enumValues[number];
export type PaymentStatus           = typeof paymentStatusEnum.enumValues[number];
export type DocumentType            = typeof documentTypeEnum.enumValues[number];
export type NotificationChannel     = typeof notificationChannelEnum.enumValues[number];
export type ServiceCategory         = typeof serviceCategoryEnum.enumValues[number];
export type UserRole                = typeof userRoleEnum.enumValues[number];
