import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { AdminAnalyticsService } from "@/features/revenue/services/adminAnalyticsService";

export const adminRouter = router({
  stats: adminProcedure.query(async ({ ctx }) => {
    return AdminAnalyticsService.getStats(ctx.db);
  }),

  classUtilisation: adminProcedure
    .input(z.object({ limit: z.number().default(10) }).default({}))
    .query(async ({ ctx, input }) => {
      return AdminAnalyticsService.getClassUtilisation(input.limit, ctx.db);
    }),

  revenueByMonth: adminProcedure.query(async ({ ctx }) => {
    return AdminAnalyticsService.getRevenueByMonth(ctx.db);
  }),

  revenueByMethod: adminProcedure.query(async ({ ctx }) => {
    return AdminAnalyticsService.getRevenueByMethod(ctx.db);
  }),

  expiringMemberships: adminProcedure.query(async ({ ctx }) => {
    return AdminAnalyticsService.getExpiringMemberships(ctx.db);
  }),

  refundCount: adminProcedure.query(async ({ ctx }) => {
    return AdminAnalyticsService.getRefundCount(ctx.db);
  }),

  checkinsPerDay: adminProcedure.query(async ({ ctx }) => {
    return AdminAnalyticsService.getCheckinsPerDay(ctx.db);
  }),

  topTrainers: adminProcedure.query(async ({ ctx }) => {
    return AdminAnalyticsService.getTopTrainers(ctx.db);
  }),

  noShowList: adminProcedure.query(async ({ ctx }) => {
    return AdminAnalyticsService.getNoShowList(ctx.db);
  }),
});
