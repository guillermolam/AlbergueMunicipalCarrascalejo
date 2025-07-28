
import { pgTable, serial, text, timestamp, integer, boolean, decimal } from 'drizzle-orm/pg-core';

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  guestName: text('guest_name').notNull(),
  email: text('email').notNull(),
  checkIn: timestamp('check_in').notNull(),
  checkOut: timestamp('check_out').notNull(),
  bedNumber: integer('bed_number'),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const beds = pgTable('beds', {
  id: serial('id').primaryKey(),
  number: integer('number').notNull().unique(),
  type: text('type').notNull(), // 'single', 'bunk_top', 'bunk_bottom'
  isAvailable: boolean('is_available').default(true),
  pricePerNight: decimal('price_per_night', { precision: 8, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  guestName: text('guest_name').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  bookingId: integer('booking_id').references(() => bookings.id),
  createdAt: timestamp('created_at').defaultNow(),
});
