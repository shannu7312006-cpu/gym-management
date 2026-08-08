import { and, desc, eq, sql } from 'drizzle-orm';
import { db as defaultDb } from '@/db';
import { bookings, classes, reschedules } from '@/db/schema';
import { TRPCError } from '@trpc/server';
import { FREE_RESCHEDULE_HOURS } from '@/config/constants';
import { hoursUntil } from '@/lib/date';

export class RescheduleService {
  /**
   * Validate if a booking can be rescheduled to a target class.
   */
  static async validateRescheduleEligibility(
    userId: number,
    fromBookingId: number,
    toClassId: number,
    db = defaultDb
  ) {
    const originalRow = await db
      .select({
        booking: bookings,
        cls: classes,
      })
      .from(bookings)
      .innerJoin(classes, eq(bookings.classId, classes.id))
      .where(eq(bookings.id, fromBookingId))
      .get();

    if (!originalRow) {
      return { valid: false as const, reason: 'Booking not found.', code: 'NOT_FOUND' as const };
    }

    const { booking: originalBooking, cls: originalClass } = originalRow;

    if (originalBooking.userId !== userId) {
      return { valid: false as const, reason: 'You cannot reschedule this booking.', code: 'FORBIDDEN' as const };
    }

    if (originalBooking.status !== 'booked' && originalBooking.status !== 'waitlisted') {
      return { valid: false as const, reason: 'This booking is no longer active.', code: 'BAD_REQUEST' as const };
    }

    const hoursBeforeOriginal = hoursUntil(originalClass.startsAt);
    if (hoursBeforeOriginal < FREE_RESCHEDULE_HOURS) {
      return {
        valid: false as const,
        reason: `You can only reschedule up to ${FREE_RESCHEDULE_HOURS} hours before the class starts.`,
        code: 'BAD_REQUEST' as const,
      };
    }

    const targetClass = await db
      .select()
      .from(classes)
      .where(eq(classes.id, toClassId))
      .get();

    if (!targetClass) {
      return { valid: false as const, reason: 'Target class not found.', code: 'NOT_FOUND' as const };
    }

    if (targetClass.name !== originalClass.name) {
      return { valid: false as const, reason: 'You can only reschedule to a class with the same name.', code: 'BAD_REQUEST' as const };
    }

    if (targetClass.id === originalClass.id) {
      return { valid: false as const, reason: 'You are already booked for this class.', code: 'BAD_REQUEST' as const };
    }

    if (hoursUntil(targetClass.startsAt) <= 0) {
      return { valid: false as const, reason: 'This class has already started.', code: 'BAD_REQUEST' as const };
    }

    if (targetClass.cancelled) {
      return { valid: false as const, reason: 'This class has been cancelled.', code: 'BAD_REQUEST' as const };
    }

    const existingBooking = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.classId, targetClass.id),
          eq(bookings.userId, userId),
          sql`${bookings.status} in ('booked', 'waitlisted')`
        )
      )
      .get();

    if (existingBooking) {
      return { valid: false as const, reason: 'You already have an active booking for this class.', code: 'CONFLICT' as const };
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(
        and(eq(bookings.classId, targetClass.id), eq(bookings.status, 'booked'))
      );

    const targetIsFull = Number(count) >= targetClass.capacity;

    return {
      valid: true as const,
      originalBooking,
      originalClass,
      targetClass,
      targetIsFull,
    };
  }

  /**
   * Reschedule a booking to a new class instance.
   */
  static async reschedule(
    userId: number,
    fromBookingId: number,
    toClassId: number,
    db = defaultDb
  ) {
    const check = await this.validateRescheduleEligibility(userId, fromBookingId, toClassId, db);
    if (!check.valid) {
      throw new TRPCError({ code: check.code, message: check.reason });
    }

    const { originalBooking, originalClass, targetClass, targetIsFull } = check;

    const newBooking = await db
      .insert(bookings)
      .values({
        classId: targetClass.id,
        userId,
        membershipId: originalBooking.membershipId,
        status: targetIsFull ? 'waitlisted' : 'booked',
        creditsUsed: originalBooking.creditsUsed,
      })
      .returning()
      .get();

    await db
      .update(bookings)
      .set({
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      })
      .where(eq(bookings.id, originalBooking.id));

    await db.insert(reschedules).values({
      userId,
      fromBookingId: originalBooking.id,
      toBookingId: newBooking.id,
      fromClassId: originalClass.id,
      toClassId: targetClass.id,
    });

    return {
      ok: true,
      newBooking,
      newStatus: targetIsFull ? ('waitlisted' as const) : ('booked' as const),
    };
  }

  /**
   * Get reschedule history for a member.
   */
  static async getHistory(userId: number, db = defaultDb) {
    return db
      .select({
        id: reschedules.id,
        rescheduledAt: reschedules.rescheduledAt,
        fromClassName: classes.name,
        fromClassTime: sql<string>`(
          SELECT ${classes.startsAt} FROM ${classes}
          WHERE ${classes.id} = ${reschedules.fromClassId}
        )`,
        fromClassRoom: sql<string>`(
          SELECT ${classes.room} FROM ${classes}
          WHERE ${classes.id} = ${reschedules.fromClassId}
        )`,
        toClassName: sql<string>`(
          SELECT ${classes.name} FROM ${classes}
          WHERE ${classes.id} = ${reschedules.toClassId}
        )`,
        toClassTime: sql<string>`(
          SELECT ${classes.startsAt} FROM ${classes}
          WHERE ${classes.id} = ${reschedules.toClassId}
        )`,
        toClassRoom: sql<string>`(
          SELECT ${classes.room} FROM ${classes}
          WHERE ${classes.id} = ${reschedules.toClassId}
        )`,
      })
      .from(reschedules)
      .innerJoin(classes, eq(reschedules.fromClassId, classes.id))
      .where(eq(reschedules.userId, userId))
      .orderBy(desc(reschedules.rescheduledAt));
  }
}
