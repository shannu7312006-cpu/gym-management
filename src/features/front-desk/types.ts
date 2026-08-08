import { z } from 'zod';

export const markAttendanceSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum(['attended', 'no_show']),
});

export const adjustCreditsSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int(), // positive to add, negative to deduct
  description: z.string().min(1),
});

export const createCompanySchema = z.object({
  name: z.string().min(1),
  domain: z.string().optional(),
  contractValueCents: z.number().int().nonnegative().default(0),
});

export const addCompanyMemberSchema = z.object({
  companyId: z.string().min(1),
  userId: z.string().min(1),
  individualMonthlyAllowance: z.number().int().nonnegative().default(0),
});

export const createCorporatePoolSchema = z.object({
  companyId: z.string().min(1),
  poolType: z.enum(['shared', 'individual_allowance']).default('shared'),
  totalSharedCredits: z.number().int().nonnegative().default(0),
  resetInterval: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type AdjustCreditsInput = z.infer<typeof adjustCreditsSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type AddCompanyMemberInput = z.infer<typeof addCompanyMemberSchema>;
export type CreateCorporatePoolInput = z.infer<typeof createCorporatePoolSchema>;
