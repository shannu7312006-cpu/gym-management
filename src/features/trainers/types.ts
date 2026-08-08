import { z } from 'zod';

export const createRescheduleRequestSchema = z.object({
  originalInstanceId: z.string().min(1),
  substituteTrainerId: z.string().optional(),
  reason: z.string().min(1),
  newDate: z.string().optional(),
  newStartTime: z.string().optional(),
});

export const updateRescheduleStatusSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
});

export type CreateRescheduleRequestInput = z.infer<typeof createRescheduleRequestSchema>;
export type UpdateRescheduleStatusInput = z.infer<typeof updateRescheduleStatusSchema>;
