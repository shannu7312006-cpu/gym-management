import { sql, eq } from 'drizzle-orm';
import { db as defaultDb } from '@/db';
import { payments, companies } from '@/db/schema';
import { GetRevenueReportInput } from '../types';

export class RevenueService {
  /**
   * Aggregate studio revenue metrics across paid transactions and corporate accounts.
   */
  static async getRevenueReport(input: GetRevenueReportInput = {}, db = defaultDb) {
    const totalPayments = await db
      .select({
        totalCents: sql<number>`COALESCE(SUM(amount_cents), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(payments)
      .where(eq(payments.status, 'paid'))
      .get();

    const revenueByMethod = await db
      .select({
        method: payments.method,
        totalCents: sql<number>`COALESCE(SUM(amount_cents), 0)`,
      })
      .from(payments)
      .where(eq(payments.status, 'paid'))
      .groupBy(payments.method);

    const corporateContracts = await db
      .select({
        totalCreditPool: sql<number>`COALESCE(SUM(credit_pool_balance), 0)`,
      })
      .from(companies)
      .get();

    return {
      totalRevenueCents: Number(totalPayments?.totalCents ?? 0),
      breakdown: revenueByMethod.map((r) => ({
        method: r.method,
        cents: Number(r.totalCents),
      })),
      corporateCreditPoolTotal: Number(corporateContracts?.totalCreditPool ?? 0),
      paymentCount: Number(totalPayments?.count ?? 0),
    };
  }
}
