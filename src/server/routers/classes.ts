import { z } from "zod";
import { router, publicProcedure, staffProcedure, adminProcedure } from "../trpc";
import { ClassManagementService } from "@/features/classes/services/classManagementService";

export const classesRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          includeCancelled: z.boolean().default(false),
        })
        .default({})
    )
    .query(async ({ ctx, input }) => {
      return ClassManagementService.listClasses(input, ctx.db);
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ClassManagementService.getClassById(input.id, ctx.db);
    }),

  create: staffProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        trainerId: z.number().optional(),
        room: z.string().min(1),
        capacity: z.number().int().positive(),
        startsAt: z.string(),
        durationMin: z.number().int().positive().default(60),
        creditCost: z.number().int().min(0).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ClassManagementService.createClass(input, ctx.db);
    }),

  update: staffProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        room: z.string().min(1).optional(),
        capacity: z.number().int().positive().optional(),
        startsAt: z.string().optional(),
        trainerId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ClassManagementService.updateClass(input, ctx.db);
    }),

  cancel: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ClassManagementService.cancelClass(input.id, ctx.db);
    }),
});
