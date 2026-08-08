import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { CompanyAdminService } from "@/features/front-desk/services/companyAdminService";

export const adminCompaniesRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return CompanyAdminService.listCompanies(ctx.db);
  }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return CompanyAdminService.getById(input.id, ctx.db);
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        contactEmail: z.string().email(),
        creditPoolBalance: z.number().int().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return CompanyAdminService.createCompany(input, ctx.db);
    }),

  updateActive: adminProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return CompanyAdminService.updateActive(input.id, input.active, ctx.db);
    }),

  topUp: adminProcedure
    .input(z.object({ id: z.number(), amount: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      return CompanyAdminService.topUp(input.id, input.amount, ctx.db);
    }),

  linkMember: adminProcedure
    .input(z.object({ companyId: z.number(), userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return CompanyAdminService.linkMember(input.companyId, input.userId, ctx.db);
    }),

  unlinkMember: adminProcedure
    .input(z.object({ companyMemberId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return CompanyAdminService.unlinkMember(input.companyMemberId, ctx.db);
    }),
});
