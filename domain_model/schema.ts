import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  decimal,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pilgrims = pgTable("pilgrims", {
  id: serial("id").primaryKey(),
  firstName: text("first_name_encrypted").notNull(),
  lastName1: text("last_name_1_encrypted").notNull(),
  lastName2: text("last_name_2_encrypted"),
  birthDate: text("birth_date_encrypted").notNull(),
  documentType: text("document_type").notNull(),
  documentNumber: text("document_number_encrypted").notNull(),
  documentSupport: text("document_support"),
  gender: text("gender").notNull(),
  nationality: text("nationality"),
  phone: text("phone_encrypted").notNull(),
  email: text("email_encrypted"),
  addressCountry: text("address_country").notNull(),
  addressStreet: text("address_street_encrypted").notNull(),
  addressStreet2: text("address_street_2_encrypted"),
  addressCity: text("address_city_encrypted").notNull(),
  addressPostalCode: text("address_postal_code").notNull(),
  addressProvince: text("address_province"),
  addressMunicipalityCode: text("address_municipality_code"),
  idPhotoUrl: text("id_photo_url"),
  language: text("language").default("es"),
  consentGiven: boolean("consent_given").default(true),
  consentDate: timestamp("consent_date").defaultNow(),
  dataRetentionUntil: timestamp("data_retention_until"),
  lastAccessDate: timestamp("last_access_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const beds = pgTable("beds", {
  id: serial("id").primaryKey(),
  bedNumber: integer("bed_number").notNull(),
  roomNumber: integer("room_number").notNull(),
  roomName: text("room_name").notNull(),
  roomType: text("room_type").default("dormitory"),
  pricePerNight: decimal("price_per_night", { precision: 10, scale: 2 })
    .notNull()
    .default("15.00"),
  currency: text("currency").default("EUR"),
  isAvailable: boolean("is_available").default(true),
  status: text("status").default("available"),
  reservedUntil: timestamp("reserved_until"),
  lastCleanedAt: timestamp("last_cleaned_at"),
  maintenanceNotes: text("maintenance_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  pilgrimId: integer("pilgrim_id")
    .references(() => pilgrims.id)
    .notNull(),
  referenceNumber: text("reference_number").notNull().unique(),
  checkInDate: date("check_in_date").notNull(),
  checkOutDate: date("check_out_date").notNull(),
  numberOfNights: integer("number_of_nights").notNull(),
  numberOfPersons: integer("number_of_persons").default(1),
  numberOfRooms: integer("number_of_rooms").default(1),
  hasInternet: boolean("has_internet").default(false),
  status: text("status").default("reserved"),
  bedAssignmentId: integer("bed_assignment_id").references(() => beds.id),
  estimatedArrivalTime: text("estimated_arrival_time"),
  notes: text("notes"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  reservationExpiresAt: timestamp("reservation_expires_at").notNull(),
  paymentDeadline: timestamp("payment_deadline").notNull(),
  autoCleanupProcessed: boolean("auto_cleanup_processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id)
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentType: text("payment_type").notNull(),
  paymentStatus: text("payment_status").default("awaiting_payment"),
  currency: text("currency").default("EUR"),
  receiptNumber: text("receipt_number"),
  paymentDate: timestamp("payment_date"),
  paymentDeadline: timestamp("payment_deadline").notNull(),
  transactionId: text("transaction_id"),
  gatewayResponse: jsonb("gateway_response"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pricing = pgTable("pricing", {
  id: serial("id").primaryKey(),
  roomType: text("room_type").notNull(),
  bedType: text("bed_type").notNull(),
  pricePerNight: decimal("price_per_night", {
    precision: 10,
    scale: 2,
  }).notNull(),
  currency: text("currency").default("EUR"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const governmentSubmissions = pgTable("government_submissions", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id)
    .notNull(),
  xmlContent: text("xml_content").notNull(),
  submissionStatus: text("submission_status").default("pending"),
  responseData: jsonb("response_data"),
  attempts: integer("attempts").default(0),
  lastAttempt: timestamp("last_attempt"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id),
  pilgrimId: integer("pilgrim_id").references(() => pilgrims.id),
  channel: text("channel").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  status: text("status").default("pending"),
  providerMessageId: text("provider_message_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  action: text("action").notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  userId: integer("user_id").references(() => users.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  auditLog: many(auditLog),
}));

export const pilgrimsRelations = relations(pilgrims, ({ many }) => ({
  bookings: many(bookings),
  notifications: many(notifications),
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
  notifications: many(notifications),
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

export const governmentSubmissionsRelations = relations(
  governmentSubmissions,
  ({ one }) => ({
    booking: one(bookings, {
      fields: [governmentSubmissions.bookingId],
      references: [bookings.id],
    }),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  booking: one(bookings, {
    fields: [notifications.bookingId],
    references: [bookings.id],
  }),
  pilgrim: one(pilgrims, {
    fields: [notifications.pilgrimId],
    references: [pilgrims.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

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
  updatedAt: true,
});

export const insertGovernmentSubmissionSchema = createInsertSchema(
  governmentSubmissions,
).omit({
  id: true,
  createdAt: true,
});

export const insertPricingSchema = createInsertSchema(pricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  createdAt: true,
});

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
export type InsertGovernmentSubmission = z.infer<
  typeof insertGovernmentSubmissionSchema
>;
export type Pricing = typeof pricing.$inferSelect;
export type InsertPricing = z.infer<typeof insertPricingSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
