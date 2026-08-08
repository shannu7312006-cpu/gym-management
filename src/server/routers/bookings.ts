import { z } from "zod";
import { router, protectedProcedure, staffProcedure } from "../trpc";
import { BookingService } from "@/features/bookings/services/bookingService";

export const bookingsRouter = router({
  mine: protectedProcedure
    .input(z.object({ includePast: z.boolean().default(false) }).default({}))
    .query(async ({ ctx, input }) => {
      return BookingService.listUserBookings(ctx.user.id, input.includePast, ctx.db);
    }),

  book: protectedProcedure
    .input(z.object({ classId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return BookingService.bookClass(ctx.user.id, input.classId, ctx.db);
    }),

  cancel: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return BookingService.cancelBooking(input.bookingId, ctx.user, ctx.db);
    }),

  markAttended: staffProcedure
    .input(
      z.object({
        bookingId: z.number(),
        source: z.enum(["front_desk", "kiosk", "app"]).default("front_desk"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return BookingService.markAttended(input.bookingId, input.source, ctx.db);
    }),

  rosterFor: staffProcedure
    .input(z.object({ classId: z.number() }))
    .query(async ({ ctx, input }) => {
      return BookingService.getRoster(input.classId, ctx.db);
    }),

  upcomingForMember: staffProcedure
    .input(z.object({ userId: z.number(), hoursAhead: z.number().default(2) }))
    .query(async ({ ctx, input }) => {
      return BookingService.getUpcomingForMember(input.userId, input.hoursAhead, ctx.db);
    }),

  checkinCountFor: staffProcedure
    .input(z.object({ classId: z.number() }))
    .query(async ({ ctx, input }) => {
      return BookingService.getCheckinCount(input.classId, ctx.db);
    }),

  waitlisted: protectedProcedure.query(async ({ ctx }) => {
    return BookingService.getWaitlistedBookings(ctx.user.id, ctx.db);
  }),
});
