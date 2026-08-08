import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { RescheduleService } from "@/features/bookings/services/rescheduleService";

export const reschedulesRouter = router({
  reschedule: protectedProcedure
    .input(
      z.object({
        fromBookingId: z.number(),
        toClassId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return RescheduleService.reschedule(
        ctx.user.id,
        input.fromBookingId,
        input.toClassId,
        ctx.db
      );
    }),

  history: protectedProcedure.query(async ({ ctx }) => {
    return RescheduleService.getHistory(ctx.user.id, ctx.db);
  }),

  validateReschedule: protectedProcedure
    .input(
      z.object({
        fromBookingId: z.number(),
        toClassId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const result = await RescheduleService.validateRescheduleEligibility(
        ctx.user.id,
        input.fromBookingId,
        input.toClassId,
        ctx.db
      );

      if (!result.valid) {
        return { valid: false as const, reason: result.reason };
      }

      return {
        valid: true as const,
        targetIsFull: result.targetIsFull,
      };
    }),
});
