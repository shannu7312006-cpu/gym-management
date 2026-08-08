import { z } from 'zod';

export const createBookingSchema = z.object({
  classInstanceId: z.string().min(1),
  paymentMethodOverride: z.enum(['membership', 'credits', 'corporate_pool', 'corporate_allowance', 'free_pass']).optional(),
});

export const cancelBookingSchema = z.object({
  bookingId: z.string().min(1),
});

export const getBookingsSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'attended', 'no_show']).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type GetBookingsInput = z.infer<typeof getBookingsSchema>;
