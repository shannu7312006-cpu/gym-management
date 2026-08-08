import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { memberships } from "./memberships";

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  membershipId: integer("membership_id").references(() => memberships.id),
  amountCents: integer("amount_cents").notNull(),
  method: text("method", { enum: ["card", "cash", "upi", "transfer"] }).notNull(),
  status: text("status", { enum: ["pending", "paid", "failed", "refunded"] })
    .notNull()
    .default("pending"),
  reference: text("reference"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type", {
    enum: ["waitlist_promotion", "class_cancelled", "membership_expiring", "announcement"],
  })
    .notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type Payment = typeof payments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
