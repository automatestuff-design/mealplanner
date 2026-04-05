import { z } from 'zod'

export const userGoalsSchema = z.object({
  calories: z.number().int().positive().nullable().optional(),
  proteinG: z.number().int().nonnegative().nullable().optional(),
  carbsG: z.number().int().nonnegative().nullable().optional(),
  fatG: z.number().int().nonnegative().nullable().optional(),
  fiberG: z.number().int().nonnegative().nullable().optional(),
})

export type UserGoalsInput = z.infer<typeof userGoalsSchema>
