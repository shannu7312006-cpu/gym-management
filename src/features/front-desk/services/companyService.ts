import { eq } from 'drizzle-orm';
import { db as defaultDb } from '@/db';
import { companies, companyMembers, users } from '@/db/schema';

export class CompanyService {
  static async listCompanies(db = defaultDb) {
    return await db.select().from(companies);
  }

  static async getCompanyDetails(companyId: number, db = defaultDb) {
    const company = await db.select().from(companies).where(eq(companies.id, companyId)).get();
    if (!company) throw new Error('Company not found');

    const members = await db
      .select({
        member: companyMembers,
        user: users,
      })
      .from(companyMembers)
      .innerJoin(users, eq(companyMembers.userId, users.id))
      .where(eq(companyMembers.companyId, companyId));

    return { company, members };
  }
}
