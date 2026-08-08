import { z } from 'zod';

export const getClassScheduleSchema = z.object({
  date: z.string().optional(),
  categoryId: z.string().optional(),
  trainerId: z.string().optional(),
});

export const createClassInstanceSchema = z.object({
  categoryId: z.string().min(1),
  trainerId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  durationMinutes: z.number().int().positive().default(60),
  capacity: z.number().int().positive().default(15),
  creditCost: z.number().int().nonnegative().default(1),
  room: z.string().default('Studio A'),
});

export type GetClassScheduleInput = z.infer<typeof getClassScheduleSchema>;
export type CreateClassInstanceInput = z.infer<typeof createClassInstanceSchema>;
