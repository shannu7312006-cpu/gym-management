import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const membershipPlans = sqliteTable("membership_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  durationDays: integer("duration_days").notNull(),
  classCredits: integer("class_credits").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const memberships = sqliteTable(
  "memberships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    planId: integer("plan_id")
      .notNull()
      .references(() => membershipPlans.id),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    creditsRemaining: integer("credits_remaining").notNull().default(0),
    status: text("status", { enum: ["active", "expired", "cancelled", "frozen"] })
      .notNull()
      .default("active"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("memberships_user_id_idx").on(table.userId),
    index("memberships_plan_id_idx").on(table.planId),
    index("memberships_status_idx").on(table.status),
  ]
);

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  contactEmail: text("contact_email").notNull(),
  creditPoolBalance: integer("credit_pool_balance").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const companyMembers = sqliteTable(
  "company_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("company_members_user_id_idx").on(table.userId),
    index("company_members_company_id_idx").on(table.companyId),
  ]
);

export type MembershipPlan = typeof membershipPlans.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type CompanyMember = typeof companyMembers.$inferSelect;
