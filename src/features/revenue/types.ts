import { z } from 'zod';

export const getRevenueReportSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type GetRevenueReportInput = z.infer<typeof getRevenueReportSchema>;
