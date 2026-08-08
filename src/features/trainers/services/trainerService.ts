import { eq, and } from 'drizzle-orm';
import { db as defaultDb } from '@/db';
import { users, classes, trainerAvailability } from '@/db/schema';

export class TrainerService {
  /**
   * List all registered trainers.
   */
  static async listTrainers(db = defaultDb) {
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        active: users.active,
      })
      .from(users)
      .where(eq(users.role, 'trainer'));
  }

  /**
   * Get trainer's assigned class schedule.
   */
  static async getTrainerSchedule(trainerId: number, db = defaultDb) {
    return await db
      .select()
      .from(classes)
      .where(and(eq(classes.trainerId, trainerId), eq(classes.cancelled, false)));
  }

  /**
   * Get trainer's availability slots.
   */
  static async getTrainerAvailability(trainerId: number, db = defaultDb) {
    return await db
      .select()
      .from(trainerAvailability)
      .where(eq(trainerAvailability.trainerId, trainerId));
  }
}
