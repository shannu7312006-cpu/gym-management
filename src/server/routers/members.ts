import { z } from "zod";
import { router, protectedProcedure, staffProcedure, adminProcedure } from "../trpc";
import { MemberService } from "@/features/members/services/memberService";

export const membersRouter = router({
  profile: protectedProcedure.query(async ({ ctx }) => {
    return MemberService.getProfile(ctx.user, ctx.db);
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        phone: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return MemberService.updateProfile(ctx.user.id, input, ctx.db);
    }),

  search: staffProcedure
    .input(z.object({ q: z.string().default(""), limit: z.number().default(50) }))
    .query(async ({ input, ctx }) => {
      return MemberService.searchMembers(input.q, input.limit, ctx.db);
    }),

  byId: staffProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return MemberService.getMemberById(input.id, ctx.db);
    }),

  setActive: adminProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      return MemberService.setActive(input.id, input.active, ctx.db);
    }),

  setRole: adminProcedure
    .input(z.object({ id: z.number(), role: z.enum(["member", "trainer", "admin"]) }))
    .mutation(async ({ input, ctx }) => {
      return MemberService.setRole(input.id, input.role, ctx.db);
    }),

  lookupByEmailOrPhone: staffProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input, ctx }) => {
      return MemberService.lookupMember(input.query, ctx.db);
    }),
});
