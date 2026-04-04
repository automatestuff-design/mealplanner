import { z } from 'zod'
import { MealType } from '@prisma/client'

export const mealEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  mealType: z.nativeEnum(MealType),
  recipeId: z.string().min(1, 'Recipe is required'),
  servings: z.number().positive().default(1),
  notes: z.string().max(500).optional(),
})

export const createMealPlanSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Week start must be in YYYY-MM-DD format'),
  name: z.string().max(100).optional(),
})

export const addMealEntrySchema = mealEntrySchema

export type MealEntryInput = z.infer<typeof mealEntrySchema>
export type CreateMealPlanInput = z.infer<typeof createMealPlanSchema>
