import { eq } from 'drizzle-orm';
import { db as defaultDb } from '@/db';
import { users, notifications } from '@/db/schema';

export class AdminService {
  /**
   * Send studio announcement notification.
   */
  static async createAnnouncement(
    title: string,
    message: string,
    targetUserId: number,
    db = defaultDb
  ) {
    await db.insert(notifications).values({
      userId: targetUserId,
      type: 'announcement',
      title,
      message,
    });

    return { success: true };
  }
}
