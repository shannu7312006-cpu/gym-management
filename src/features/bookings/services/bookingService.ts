import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db as defaultDb } from "@/db";
import { bookings, classes, memberships } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { FREE_CANCELLATION_HOURS, UNLIMITED_CREDITS } from "@/config/constants";
import { hoursUntil } from "@/lib/date";
import { assertClassBookable } from "../utils/bookingValidation";
import { RosterService } from "./rosterService";

type DbClient = typeof defaultDb;

export { FREE_CANCELLATION_HOURS, UNLIMITED_CREDITS };

export class BookingService {
  static async activeMembershipFor(db = defaultDb, userId: number) {
    const today = new Date().toISOString().slice(0, 10);
    return db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.status, "active"),
          sql`${memberships.endDate} >= ${today}`
        )
      )
      .orderBy(desc(memberships.endDate))
      .get();
  }

  static async listUserBookings(userId: number, includePast = false, db = defaultDb) {
    const rows = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        creditsUsed: bookings.creditsUsed,
        bookedAt: bookings.bookedAt,
        classId: classes.id,
        className: classes.name,
        room: classes.room,
        startsAt: classes.startsAt,
        durationMin: classes.durationMin,
        cancelled: classes.cancelled,
      })
      .from(bookings)
      .innerJoin(classes, eq(bookings.classId, classes.id))
      .where(eq(bookings.userId, userId))
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
        .from(bookings)
        .where(
          and(
            eq(bookings.classId, cls!.id),
            eq(bookings.userId, userId),
            inArray(bookings.status, ["booked", "waitlisted"])
          )
        )
        .get();

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already on the list for this class.",
        });
      }

      const membership = await this.activeMembershipFor(tx as unknown as DbClient, userId);
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "An active membership is required to book classes.",
        });
      }

      const unlimited = membership.creditsRemaining >= UNLIMITED_CREDITS;
      if (!unlimited && membership.creditsRemaining < cls!.creditCost) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not enough class credits remaining.",
        });
      }

      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(
          and(eq(bookings.classId, cls!.id), eq(bookings.status, "booked"))
        );

      const isFull = Number(count) >= cls!.capacity;

      const created = await tx
        .insert(bookings)
        .values({
          classId: cls!.id,
          userId,
          membershipId: membership.id,
          status: isFull ? "waitlisted" : "booked",
          creditsUsed: isFull ? 0 : cls!.creditCost,
        })
        .returning()
        .get();

      if (!isFull && !unlimited) {
        await tx
          .update(memberships)
          .set({ creditsRemaining: membership.creditsRemaining - cls!.creditCost })
          .where(eq(memberships.id, membership.id));
      }

      return created;
    });
  }

  private static async refundBookingCredits(
    tx: DbClient,
    membershipId: number | null,
    creditsUsed: number
  ) {
    if (!membershipId || creditsUsed <= 0) return;
    const ms = await tx
      .select()
      .from(memberships)
      .where(eq(memberships.id, membershipId))
      .get();

    if (ms && ms.creditsRemaining < UNLIMITED_CREDITS) {
      await tx
        .update(memberships)
        .set({ creditsRemaining: ms.creditsRemaining + creditsUsed })
        .where(eq(memberships.id, ms.id));
    }
  }

  private static async promoteNextWaitlistedUser(
    tx: DbClient,
    classId: number,
    creditCost: number
  ) {
    const next = await tx
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.classId, classId),
          eq(bookings.status, "waitlisted")
        )
      )
      .orderBy(asc(bookings.bookedAt))
      .get();

    if (next) {
      await tx
        .update(bookings)
        .set({ status: "booked", creditsUsed: creditCost })
        .where(eq(bookings.id, next.id));

      if (next.membershipId) {
        const ms = await tx
          .select()
          .from(memberships)
          .where(eq(memberships.id, next.membershipId))
          .get();

        if (ms && ms.creditsRemaining < UNLIMITED_CREDITS) {
          await tx
            .update(memberships)
            .set({
              creditsRemaining: Math.max(0, ms.creditsRemaining - creditCost),
            })
            .where(eq(memberships.id, ms.id));
        }
      }
    }
  }

  private static async finalizeCancellation(
    tx: DbClient,
    bookingId: number
  ) {
    await tx
      .update(bookings)
      .set({ status: "cancelled", cancelledAt: new Date().toISOString() })
      .where(eq(bookings.id, bookingId));
  }

  static async cancelBooking(
    bookingId: number,
    user: { id: number; role: string },
    db = defaultDb
  ) {
    return await db.transaction(async (tx) => {
      const txDb = tx as unknown as DbClient;
      const row = await tx
        .select({ booking: bookings, cls: classes })
        .from(bookings)
        .innerJoin(classes, eq(bookings.classId, classes.id))
        .where(eq(bookings.id, bookingId))
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
        hoursUntil(row.cls.startsAt) >= FREE_CANCELLATION_HOURS &&
        row.booking.creditsUsed > 0;

      await this.finalizeCancellation(txDb, row.booking.id);

      if (refundable) {
        await this.refundBookingCredits(
          txDb,
          row.booking.membershipId,
          row.booking.creditsUsed
        );
      }

      // Freeing a confirmed spot promotes the member who has waited longest.
      if (row.booking.status === "booked") {
        await this.promoteNextWaitlistedUser(txDb, row.cls.id, row.cls.creditCost);
      }

      return { ok: true, refunded: refundable };
    });
  }

  // Delegated Roster / Attendance methods for backwards compatibility
  static markAttended = RosterService.markAttended;
  static getRoster = RosterService.getRoster;
  static getUpcomingForMember = RosterService.getUpcomingForMember;
  static getCheckinCount = RosterService.getCheckinCount;

  static async getWaitlistedBookings(userId: number, db = defaultDb) {
    const waitlistedBookings = await db
      .select({
        bookingId: bookings.id,
        classId: classes.id,
        className: classes.name,
        room: classes.room,
        startsAt: classes.startsAt,
        durationMin: classes.durationMin,
        capacity: classes.capacity,
        bookedAt: bookings.bookedAt,
      })
      .from(bookings)
      .innerJoin(classes, eq(bookings.classId, classes.id))
      .where(
        and(
          eq(bookings.userId, userId),
          eq(bookings.status, "waitlisted")
        )
      )
      .orderBy(asc(classes.startsAt));

    const result = await Promise.all(
      waitlistedBookings.map(async (wb) => {
        const [{ position }] = await db
          .select({ position: sql<number>`count(*)` })
          .from(bookings)
          .where(
            and(
              eq(bookings.classId, wb.classId),
              eq(bookings.status, "waitlisted"),
              sql`${bookings.bookedAt} < ${wb.bookedAt}`
            )
          );

        return {
          ...wb,
          position: Number(position) + 1,
        };
      })
    );

    return result;
  }
}
