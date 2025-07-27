import { pgTable, text, serial, integer, boolean, timestamp, decimal, date, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pilgrims table with GDPR/NIS2 compliance (encrypted fields)
export const pilgrims = pgTable("pilgrims", {
  id: serial("id").primaryKey(),
  // Encrypted personal data (GDPR/NIS2 compliance)
  firstName: text("first_name_encrypted").notNull(), // Encrypted at rest
  lastName1: text("last_name_1_encrypted").notNull(), // Encrypted at rest
  lastName2: text("last_name_2_encrypted"), // Encrypted at rest
  birthDate: text("birth_date_encrypted").notNull(), // Encrypted at rest
  documentType: text("document_type").notNull(),
  documentNumber: text("document_number_encrypted").notNull(), // Encrypted at rest
  documentSupport: text("document_support"),
  gender: text("gender").notNull(),
  nationality: text("nationality"),
  phone: text("phone_encrypted").notNull(), // Encrypted at rest
  email: text("email_encrypted"), // Encrypted at rest
  addressCountry: text("address_country").notNull(),
  addressStreet: text("address_street_encrypted").notNull(), // Encrypted at rest
  addressStreet2: text("address_street_2_encrypted"), // Encrypted at rest
  addressCity: text("address_city_encrypted").notNull(), // Encrypted at rest
  addressPostalCode: text("address_postal_code").notNull(),
  addressProvince: text("address_province"),
  addressMunicipalityCode: text("address_municipality_code"),
  idPhotoUrl: text("id_photo_url"),
  language: text("language").default("es"),
  // GDPR compliance fields
  consentGiven: boolean("consent_given").default(true),
  consentDate: timestamp("consent_date").defaultNow(),
  dataRetentionUntil: timestamp("data_retention_until"), // Auto-delete after legal period
  lastAccessDate: timestamp("last_access_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Beds table for room and bed management
export const beds = pgTable("beds", {
  id: serial("id").primaryKey(),
  bedNumber: integer("bed_number").notNull(),
  roomNumber: integer("room_number").notNull(),
  roomName: text("room_name").notNull(),
  roomType: text("room_type").default("dormitory"), // only dormitory beds available
  pricePerNight: decimal("price_per_night", { precision: 10, scale: 2 }).notNull().default("15.00"), // Secure pricing stored in DB
  currency: text("currency").default("EUR"),
  isAvailable: boolean("is_available").default(true),
  status: text("status").default("available"), // available, reserved, occupied, maintenance, cleaning
  reservedUntil: timestamp("reserved_until"), // When reservation expires
  lastCleanedAt: timestamp("last_cleaned_at"),
  maintenanceNotes: text("maintenance_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  pilgrimId: integer("pilgrim_id").references(() => pilgrims.id).notNull(),
  referenceNumber: text("reference_number").notNull().unique(),
  checkInDate: date("check_in_date").notNull(),
  checkOutDate: date("check_out_date").notNull(),
  numberOfNights: integer("number_of_nights").notNull(),
  numberOfPersons: integer("number_of_persons").default(1),
  numberOfRooms: integer("number_of_rooms").default(1),
  hasInternet: boolean("has_internet").default(false),
  status: text("status").default("reserved"), // reserved, confirmed, checked_in, checked_out, cancelled, expired
  bedAssignmentId: integer("bed_assignment_id").references(() => beds.id),
  estimatedArrivalTime: text("estimated_arrival_time"),
  notes: text("notes"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  // Reservation timeout fields
  reservationExpiresAt: timestamp("reservation_expires_at").notNull(), // 2 hours from creation
  paymentDeadline: timestamp("payment_deadline").notNull(), // Same as expiration
  autoCleanupProcessed: boolean("auto_cleanup_processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentType: text("payment_type").notNull(), // efect, tarjeta, bizum, transferencia
  paymentStatus: text("payment_status").default("awaiting_payment"), // awaiting_payment, completed, failed, cancelled, expired
  currency: text("currency").default("EUR"),
  receiptNumber: text("receipt_number"),
  paymentDate: timestamp("payment_date"),
  paymentDeadline: timestamp("payment_deadline").notNull(), // 2 hours from creation
  transactionId: text("transaction_id"),
  gatewayResponse: jsonb("gateway_response"), // For card payments
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pricing table for dynamic pricing
export const pricing = pgTable("pricing", {
  id: serial("id").primaryKey(),
  roomType: text("room_type").notNull(), // dormitory, private
  bedType: text("bed_type").notNull(), // shared, private
  pricePerNight: decimal("price_per_night", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("EUR"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Government submissions table for SOAP API compliance
export const governmentSubmissions = pgTable("government_submissions", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id).notNull(),
  xmlContent: text("xml_content").notNull(),
  submissionStatus: text("submission_status").default("pending"), // pending, success, failed
  responseData: jsonb("response_data"),
  attempts: integer("attempts").default(0),
  lastAttempt: timestamp("last_attempt"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const pilgrimsRelations = relations(pilgrims, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  pilgrim: one(pilgrims, {
    fields: [bookings.pilgrimId],
    references: [pilgrims.id],
  }),
  bed: one(beds, {
    fields: [bookings.bedAssignmentId],
    references: [beds.id],
  }),
  payments: many(payments),
  governmentSubmissions: many(governmentSubmissions),
}));

export const bedsRelations = relations(beds, ({ many }) => ({
  bookings: many(bookings),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

export const governmentSubmissionsRelations = relations(governmentSubmissions, ({ one }) => ({
  booking: one(bookings, {
    fields: [governmentSubmissions.bookingId],
    references: [bookings.id],
  }),
}));

// Insert schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPilgrimSchema = createInsertSchema(pilgrims).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBedSchema = createInsertSchema(beds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertGovernmentSubmissionSchema = createInsertSchema(governmentSubmissions).omit({
  id: true,
  createdAt: true,
});

export const insertPricingSchema = createInsertSchema(pricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for TypeScript consumers
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Pilgrim = typeof pilgrims.$inferSelect;
export type InsertPilgrim = z.infer<typeof insertPilgrimSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Bed = typeof beds.$inferSelect;
export type InsertBed = z.infer<typeof insertBedSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type GovernmentSubmission = typeof governmentSubmissions.$inferSelect;
export type InsertGovernmentSubmission = z.infer<typeof insertGovernmentSubmissionSchema>;
export type Pricing = typeof pricing.$inferSelect;
export type InsertPricing = z.infer<typeof insertPricingSchema>;