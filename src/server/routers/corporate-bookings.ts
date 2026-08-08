import { z } from "zod";
import { router, protectedProcedure, staffProcedure } from "../trpc";
import { CorporateBookingService } from "@/features/bookings/services/corporateBookingService";

export const corporateBookingsRouter = router({
  mine: protectedProcedure
    .input(z.object({ includePast: z.boolean().default(false) }).default({}))
    .query(async ({ ctx, input }) => {
      return CorporateBookingService.listUserBookings(ctx.user.id, input.includePast, ctx.db);
    }),

  book: protectedProcedure
    .input(z.object({ classId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return CorporateBookingService.bookClass(ctx.user.id, input.classId, ctx.db);
    }),

  cancel: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return CorporateBookingService.cancelBooking(input.bookingId, ctx.user, ctx.db);
    }),

  markAttended: staffProcedure
    .input(
      z.object({
        bookingId: z.number(),
        source: z.enum(["front_desk", "kiosk", "app"]).default("front_desk"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return CorporateBookingService.markAttended(input.bookingId, ctx.db);
    }),

  rosterFor: staffProcedure
    .input(z.object({ classId: z.number() }))
    .query(async ({ ctx, input }) => {
      return CorporateBookingService.getRoster(input.classId, ctx.db);
    }),
});
