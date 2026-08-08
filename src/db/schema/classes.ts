import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const classes = sqliteTable(
  "classes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    trainerId: integer("trainer_id").references(() => users.id),
    room: text("room").notNull(),
    capacity: integer("capacity").notNull(),
    startsAt: text("starts_at").notNull(),
    durationMin: integer("duration_min").notNull().default(60),
    creditCost: integer("credit_cost").notNull().default(1),
    cancelled: integer("cancelled", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("classes_trainer_id_idx").on(table.trainerId),
    index("classes_starts_at_idx").on(table.startsAt),
  ]
);

export const trainerAvailability = sqliteTable(
  "trainer_availability",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    trainerId: integer("trainer_id")
      .notNull()
      .references(() => users.id),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("trainer_avail_trainer_id_idx").on(table.trainerId),
  ]
);

export type GymClass = typeof classes.$inferSelect;
export type TrainerAvailability = typeof trainerAvailability.$inferSelect;
