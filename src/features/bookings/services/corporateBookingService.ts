import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db as defaultDb } from "@/db";
import {
  corporateBookings,
  classes,
  companies,
  companyMembers,
  checkins,
  users,
} from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { CORPORATE_FREE_CANCELLATION_HOURS } from "@/config/constants";
import { hoursUntil } from "@/lib/date";
import { assertClassBookable } from "../utils/bookingValidation";

type DbClient = typeof defaultDb;

export { CORPORATE_FREE_CANCELLATION_HOURS };

export class CorporateBookingService {
  static async getCompanyForMember(userId: number, db = defaultDb) {
    return db
      .select()
      .from(companyMembers)
      .innerJoin(companies, eq(companyMembers.companyId, companies.id))
      .where(
        and(
          eq(companyMembers.userId, userId),
          eq(companies.active, true)
        )
      )
      .get();
  }

  static async listUserBookings(userId: number, includePast = false, db = defaultDb) {
    const rows = await db
      .select({
        id: corporateBookings.id,
        status: corporateBookings.status,
        creditsUsed: corporateBookings.creditsUsed,
        bookedAt: corporateBookings.bookedAt,
        classId: classes.id,
        className: classes.name,
        room: classes.room,
        startsAt: classes.startsAt,
        durationMin: classes.durationMin,
        cancelled: classes.cancelled,
        companyName: companies.name,
      })
      .from(corporateBookings)
      .innerJoin(classes, eq(corporateBookings.classId, classes.id))
      .innerJoin(companies, eq(corporateBookings.companyId, companies.id))
      .where(eq(corporateBookings.userId, userId))
      .orderBy(asc(classes.startsAt));

    const now = new Date();
    return rows.filter((r) => (includePast ? true : new Date(r.startsAt) >= now));
  }

  static async bookClass(userId: number, classId: number, db = defaultDb) {
    return await db.transaction(async (tx) => {
      const cls = await tx
        .select()
        .from(classes)
        .where(eq(classes.id, classId))
        .get();

      assertClassBookable(cls);

      const existing = await tx
        .select()
        .from(corporateBookings)
        .where(
          and(
            eq(corporateBookings.classId, cls!.id),
            eq(corporateBookings.userId, userId),
            inArray(corporateBookings.status, ["booked", "waitlisted"])
          )
        )
        .get();

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already on the list for this class.",
        });
      }

      const companyRow = await this.getCompanyForMember(userId, tx as unknown as DbClient);
      if (!companyRow) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not linked to an active company.",
        });
      }

      const company = companyRow.companies;
      if (company.creditPoolBalance < cls!.creditCost) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your company does not have enough credits.",
        });
      }

      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(corporateBookings)
        .where(
          and(
            eq(corporateBookings.classId, cls!.id),
            eq(corporateBookings.status, "booked")
          )
        );

      const isFull = Number(count) >= cls!.capacity;

      const created = await tx
        .insert(corporateBookings)
        .values({
          classId: cls!.id,
          userId,
          companyId: company.id,
          status: isFull ? "waitlisted" : "booked",
          creditsUsed: isFull ? 0 : cls!.creditCost,
        })
        .returning()
        .get();

      if (!isFull) {
        await tx
          .update(companies)
          .set({
            creditPoolBalance: company.creditPoolBalance - cls!.creditCost,
          })
          .where(eq(companies.id, company.id));
      }

      return created;
    });
  }

  static async cancelBooking(
    bookingId: number,
    user: { id: number; role: string },
    db = defaultDb
  ) {
    return await db.transaction(async (tx) => {
      const row = await tx
        .select({ booking: corporateBookings, cls: classes })
        .from(corporateBookings)
        .innerJoin(classes, eq(corporateBookings.classId, classes.id))
        .where(eq(corporateBookings.id, bookingId))
        .get();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found." });
      }

      const isOwner = row.booking.userId === user.id;
      const isStaff = user.role === "admin" || user.role === "trainer";
      if (!isOwner && !isStaff) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot cancel this booking.",
        });
      }

      if (row.booking.status !== "booked" && row.booking.status !== "waitlisted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This booking is no longer active.",
        });
      }

      const refundable =
        hoursUntil(row.cls.startsAt) >= CORPORATE_FREE_CANCELLATION_HOURS &&
        row.booking.creditsUsed > 0;

      await tx
        .update(corporateBookings)
        .set({ status: "cancelled", cancelledAt: new Date().toISOString() })
        .where(eq(corporateBookings.id, row.booking.id));

      if (refundable) {
        const company = await tx
          .select()
          .from(companies)
          .where(eq(companies.id, row.booking.companyId))
          .get();

        if (company) {
          await tx
            .update(companies)
            .set({
              creditPoolBalance: company.creditPoolBalance + row.booking.creditsUsed,
            })
            .where(eq(companies.id, company.id));
        }
      }

      if (row.booking.status === "booked") {
        const next = await tx
          .select()
          .from(corporateBookings)
          .where(
            and(
              eq(corporateBookings.classId, row.cls.id),
              eq(corporateBookings.status, "waitlisted")
            )
          )
          .orderBy(asc(corporateBookings.bookedAt))
          .get();

        if (next) {
          await tx
            .update(corporateBookings)
            .set({ status: "booked", creditsUsed: row.cls.creditCost })
            .where(eq(corporateBookings.id, next.id));

          const company = await tx
            .select()
            .from(companies)
            .where(eq(companies.id, next.companyId))
            .get();

          if (company && company.creditPoolBalance >= row.cls.creditCost) {
            await tx
              .update(companies)
              .set({
                creditPoolBalance: Math.max(
                  0,
                  company.creditPoolBalance - row.cls.creditCost
                ),
              })
              .where(eq(companies.id, company.id));
          }
        }
      }

      return { ok: true, refunded: refundable };
    });
  }

  static async markAttended(
    bookingId: number,
    db = defaultDb
  ) {
    return await db.transaction(async (tx) => {
      const booking = await tx
        .select()
        .from(corporateBookings)
        .where(eq(corporateBookings.id, bookingId))
        .get();

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found." });
      }
      if (booking.status !== "booked") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only confirmed bookings can be checked in.",
        });
      }

      await tx
        .update(corporateBookings)
        .set({ status: "attended" })
        .where(eq(corporateBookings.id, booking.id));

      await tx.insert(checkins).values({
        userId: booking.userId,
        bookingId: null,
      });

      return { ok: true };
    });
  }

  static async getRoster(classId: number, db = defaultDb) {
    return db
      .select({
        bookingId: corporateBookings.id,
        status: corporateBookings.status,
        memberId: users.id,
        memberName: users.name,
        memberEmail: users.email,
        bookedAt: corporateBookings.bookedAt,
        companyName: companies.name,
      })
      .from(corporateBookings)
      .innerJoin(users, eq(corporateBookings.userId, users.id))
      .innerJoin(companies, eq(corporateBookings.companyId, companies.id))
      .where(eq(corporateBookings.classId, classId))
      .orderBy(asc(corporateBookings.bookedAt));
  }
}
