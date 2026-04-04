import type { RecipeIngredientWithDetail, NutritionSummary } from '@/types'

// Unit-to-gram conversion map for common units
// Values are approximate averages
const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  mg: 0.001,
  oz: 28.35,
  lb: 453.59,
  ml: 1, // approximate (water density)
  l: 1000,
  cup: 240,
  cups: 240,
  tbsp: 15,
  tsp: 5,
  whole: 100, // fallback for whole items
  slice: 30,
  piece: 100,
  clove: 5, // garlic clove ~5g
}

function toGrams(quantity: number, unit: string): number | null {
  const normalized = unit.toLowerCase().trim()
  const factor = UNIT_TO_GRAMS[normalized]
  if (!factor) return null
  return quantity * factor
}

export function calculateRecipeNutrition(
  ingredients: RecipeIngredientWithDetail[],
  servings: number
): NutritionSummary {
  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  let totalFiber = 0

  for (const ri of ingredients) {
    const grams = toGrams(ri.quantity, ri.unit)
    if (grams === null) continue

    const factor = grams / 100

    totalCalories += (ri.ingredient.calories ?? 0) * factor
    totalProtein += (ri.ingredient.proteinG ?? 0) * factor
    totalCarbs += (ri.ingredient.carbsG ?? 0) * factor
    totalFat += (ri.ingredient.fatG ?? 0) * factor
    totalFiber += (ri.ingredient.fiberG ?? 0) * factor
  }

  const perServingDivisor = servings > 0 ? servings : 1

  return {
    calories: Math.round(totalCalories / perServingDivisor),
    proteinG: Math.round(totalProtein / perServingDivisor),
    carbsG: Math.round(totalCarbs / perServingDivisor),
    fatG: Math.round(totalFat / perServingDivisor),
    fiberG: Math.round(totalFiber / perServingDivisor),
    perServing: true,
  }
}

export function scaledNutrition(nutrition: NutritionSummary, servings: number): NutritionSummary {
  return {
    calories: Math.round(nutrition.calories * servings),
    proteinG: Math.round(nutrition.proteinG * servings),
    carbsG: Math.round(nutrition.carbsG * servings),
    fatG: Math.round(nutrition.fatG * servings),
    fiberG: Math.round(nutrition.fiberG * servings),
    perServing: false,
  }
}
