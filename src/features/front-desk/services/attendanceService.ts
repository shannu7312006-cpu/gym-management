import { eq, and } from 'drizzle-orm';
import { db as defaultDb } from '@/db';
import { bookings, classes, users } from '@/db/schema';

export class AttendanceService {
  /**
   * Mark member attendance or no-show at front desk.
   */
  static async markAttendance(bookingId: number, status: 'attended' | 'no_show', db = defaultDb) {
    const booking = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .get();

    if (!booking) {
      throw new Error('Booking not found');
    }

    await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, bookingId));

    return { success: true, bookingId, status };
  }

  /**
   * Get class roster with member details for front desk / kiosk check-in.
   */
  static async getClassRoster(classId: number, db = defaultDb) {
    return await db
      .select({
        booking: bookings,
        user: users,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(
        and(
          eq(bookings.classId, classId),
          eq(bookings.status, 'booked')
        )
      );
  }
}
