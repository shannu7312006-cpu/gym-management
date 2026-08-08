import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { db as defaultDb } from '@/db';
import { users, memberships, membershipPlans, bookings } from '@/db/schema';
import { TRPCError } from '@trpc/server';

export class MemberService {
  /**
   * Get user profile with membership details and classes attended count.
   */
  static async getProfile(
    user: { id: number; name: string; email: string; phone: string | null; role: string },
    db = defaultDb
  ) {
    const membership = await db
      .select({
        id: memberships.id,
        status: memberships.status,
        startDate: memberships.startDate,
        endDate: memberships.endDate,
        creditsRemaining: memberships.creditsRemaining,
        planName: membershipPlans.name,
        planCredits: membershipPlans.classCredits,
      })
      .from(memberships)
      .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
      .where(eq(memberships.userId, user.id))
      .orderBy(desc(memberships.endDate))
      .get();

    const [{ attended }] = await db
      .select({ attended: sql<number>`count(*)` })
      .from(bookings)
      .where(and(eq(bookings.userId, user.id), eq(bookings.status, 'attended')));

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      membership: membership ?? null,
      classesAttended: Number(attended),
    };
  }

  /**
   * Update member profile fields.
   */
  static async updateProfile(
    userId: number,
    input: { name?: string; phone?: string | null },
    db = defaultDb
  ) {
    return db
      .update(users)
      .set(input)
      .where(eq(users.id, userId))
      .returning()
      .get();
  }

  /**
   * Search members by name or email.
   */
  static async searchMembers(query: string, limit = 50, db = defaultDb) {
    const term = `%${query.trim()}%`;
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        active: users.active,
      })
      .from(users)
      .where(query.trim() ? or(like(users.name, term), like(users.email, term)) : undefined)
      .limit(limit);
  }

  /**
   * Get member details and membership history by ID.
   */
  static async getMemberById(id: number, db = defaultDb) {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .get();

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found.' });
    }

    const history = await db
      .select({
        id: memberships.id,
        planName: membershipPlans.name,
        startDate: memberships.startDate,
        endDate: memberships.endDate,
        status: memberships.status,
        creditsRemaining: memberships.creditsRemaining,
      })
      .from(memberships)
      .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
      .where(eq(memberships.userId, user.id))
      .orderBy(desc(memberships.startDate));

    const { passwordHash: _omit, ...safe } = user;
    return { ...safe, memberships: history };
  }

  /**
   * Set member active status.
   */
  static async setActive(id: number, active: boolean, db = defaultDb) {
    return db
      .update(users)
      .set({ active })
      .where(eq(users.id, id))
      .returning()
      .get();
  }

  /**
   * Set member role.
   */
  static async setRole(id: number, role: 'member' | 'trainer' | 'admin', db = defaultDb) {
    return db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning()
      .get();
  }

  /**
   * Lookup member by email or phone.
   */
  static async lookupMember(query: string, db = defaultDb) {
    const term = `%${query.trim()}%`;
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        active: users.active,
      })
      .from(users)
      .where(or(like(users.email, term), like(users.phone, term)))
      .get();

    if (!user || user.role !== 'member') {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found.' });
    }

    return user;
  }
}
