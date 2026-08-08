import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export const purchasePlanSchema = z.object({
  planId: z.string().min(1),
});

export const addCreditsSchema = z.object({
  creditsAmount: z.number().int().positive(),
  costCents: z.number().int().positive(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type PurchasePlanInput = z.infer<typeof purchasePlanSchema>;
export type AddCreditsInput = z.infer<typeof addCreditsSchema>;
