import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { classes } from "./classes";
import { memberships, companies } from "./memberships";

export const bookings = sqliteTable(
  "bookings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    membershipId: integer("membership_id").references(() => memberships.id),
    status: text("status", {
      enum: ["booked", "cancelled", "attended", "no_show", "waitlisted"],
    })
      .notNull()
      .default("booked"),
    creditsUsed: integer("credits_used").notNull().default(0),
    bookedAt: text("booked_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    cancelledAt: text("cancelled_at"),
  },
  (table) => [
    index("bookings_class_id_idx").on(table.classId),
    index("bookings_user_id_idx").on(table.userId),
    index("bookings_status_idx").on(table.status),
  ]
);

export const corporateBookings = sqliteTable(
  "corporate_bookings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    status: text("status", {
      enum: ["booked", "cancelled", "attended", "no_show", "waitlisted"],
    })
      .notNull()
      .default("booked"),
    creditsUsed: integer("credits_used").notNull().default(0),
    bookedAt: text("booked_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    cancelledAt: text("cancelled_at"),
  },
  (table) => [
    index("corp_bookings_class_id_idx").on(table.classId),
    index("corp_bookings_user_id_idx").on(table.userId),
    index("corp_bookings_company_id_idx").on(table.companyId),
    index("corp_bookings_status_idx").on(table.status),
  ]
);

export const checkins = sqliteTable(
  "checkins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    bookingId: integer("booking_id").references(() => bookings.id),
    checkedInAt: text("checked_in_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    source: text("source", { enum: ["front_desk", "kiosk", "app"] })
      .notNull()
      .default("front_desk"),
  },
  (table) => [
    index("checkins_user_id_idx").on(table.userId),
    index("checkins_booking_id_idx").on(table.bookingId),
  ]
);

export const reschedules = sqliteTable(
  "reschedules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    fromBookingId: integer("from_booking_id")
      .notNull()
      .references(() => bookings.id),
    toBookingId: integer("to_booking_id")
      .notNull()
      .references(() => bookings.id),
    fromClassId: integer("from_class_id")
      .notNull()
      .references(() => classes.id),
    toClassId: integer("to_class_id")
      .notNull()
      .references(() => classes.id),
    rescheduledAt: text("rescheduled_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("reschedules_user_id_idx").on(table.userId),
    index("reschedules_from_class_id_idx").on(table.fromClassId),
    index("reschedules_to_class_id_idx").on(table.toClassId),
  ]
);

export type Booking = typeof bookings.$inferSelect;
export type CorporateBooking = typeof corporateBookings.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type Reschedule = typeof reschedules.$inferSelect;
