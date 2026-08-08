import { eq, and, asc } from 'drizzle-orm';
import { db as defaultDb } from '@/db';
import { bookings, classes } from '@/db/schema';

export class WaitlistService {
  /**
   * Get queue entries for a class sorted chronologically by bookedAt.
   */
  static async getClassWaitlist(classId: number, db = defaultDb) {
    return await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.classId, classId), eq(bookings.status, 'waitlisted')))
      .orderBy(asc(bookings.bookedAt));
  }

  /**
   * Leave waitlist by updating booking status to cancelled.
   */
  static async leaveWaitlist(bookingId: number, userId: number, db = defaultDb) {
    const booking = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)))
      .get();

    if (!booking) {
      throw new Error('Waitlist entry not found or unauthorized');
    }

    await db
      .update(bookings)
      .set({ status: 'cancelled', cancelledAt: new Date().toISOString() })
      .where(eq(bookings.id, bookingId));

    return { success: true };
  }
}
