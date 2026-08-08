import { and, asc, eq, sql } from "drizzle-orm";
import { db as defaultDb } from "@/db";
import { bookings, classes, checkins, users } from "@/db/schema";
import { TRPCError } from "@trpc/server";

export class RosterService {
  static async markAttended(
    bookingId: number,
    source: "front_desk" | "kiosk" | "app" = "front_desk",
    db = defaultDb
  ) {
    return await db.transaction(async (tx) => {
      const booking = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
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
        .update(bookings)
        .set({ status: "attended" })
        .where(eq(bookings.id, booking.id));

      await tx.insert(checkins).values({
        userId: booking.userId,
        bookingId: booking.id,
        source,
      });

      return { ok: true };
    });
  }

  static async getRoster(classId: number, db = defaultDb) {
    return db
      .select({
        bookingId: bookings.id,
        status: bookings.status,
        memberId: users.id,
        memberName: users.name,
        memberEmail: users.email,
        bookedAt: bookings.bookedAt,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(eq(bookings.classId, classId))
      .orderBy(asc(bookings.bookedAt));
  }

  static async getUpcomingForMember(userId: number, hoursAhead = 2, db = defaultDb) {
    const now = new Date().toISOString();
    const futureTime = new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();

    return db
      .select({
        bookingId: bookings.id,
        bookingStatus: bookings.status,
        classId: classes.id,
        className: classes.name,
        room: classes.room,
        startsAt: classes.startsAt,
        durationMin: classes.durationMin,
        capacity: classes.capacity,
        trainerId: classes.trainerId,
        trainerName: users.name,
      })
      .from(bookings)
      .innerJoin(classes, eq(bookings.classId, classes.id))
      .leftJoin(users, eq(classes.trainerId, users.id))
      .where(
        and(
          eq(bookings.userId, userId),
          eq(bookings.status, "booked"),
          sql`${classes.startsAt} >= ${now}`,
          sql`${classes.startsAt} <= ${futureTime}`,
          eq(classes.cancelled, false)
        )
      )
      .orderBy(classes.startsAt);
  }

  static async getCheckinCount(classId: number, db = defaultDb) {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(checkins)
      .innerJoin(bookings, eq(checkins.bookingId, bookings.id))
      .where(eq(bookings.classId, classId));

    return { count: Number(result?.count ?? 0) };
  }
}
