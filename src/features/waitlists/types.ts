import { z } from 'zod';

export const joinWaitlistSchema = z.object({
  classInstanceId: z.string().min(1),
});

export const leaveWaitlistSchema = z.object({
  waitlistId: z.string().min(1),
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
export type LeaveWaitlistInput = z.infer<typeof leaveWaitlistSchema>;
