import { z } from 'zod'

export const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1, 'Ingredient is required'),
  ingredientName: z.string().min(1, 'Ingredient name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  notes: z.string().optional(),
})

export const recipeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  instructions: z.string().min(1, 'Instructions are required'),
  prepTime: z.number().int().nonnegative().optional().nullable(),
  cookTime: z.number().int().nonnegative().optional().nullable(),
  servings: z.number().int().positive().default(1),
  imageUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
  ingredients: z.array(recipeIngredientSchema).min(1, 'At least one ingredient is required'),
})

export const updateRecipeSchema = recipeSchema.partial()

export type RecipeInput = z.infer<typeof recipeSchema>
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>
export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>
