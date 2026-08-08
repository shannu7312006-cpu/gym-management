import { eq, and, gte, lte, asc } from 'drizzle-orm';
import { db as defaultDb } from '@/db';
import { classes, users } from '@/db/schema';
import { GetClassScheduleInput } from '../types';

export class ClassService {
  /**
   * List class instances with trainer details.
   */
  static async listClassInstances(input: GetClassScheduleInput = {}, db = defaultDb) {
    const conditions = [];

    if (input.date) {
      conditions.push(gte(classes.startsAt, input.date));
    }
    if (input.trainerId) {
      conditions.push(eq(classes.trainerId, Number(input.trainerId)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await db
      .select({
        instance: classes,
        trainerUser: users,
      })
      .from(classes)
      .leftJoin(users, eq(classes.trainerId, users.id))
      .where(whereClause)
      .orderBy(asc(classes.startsAt));
  }
}
