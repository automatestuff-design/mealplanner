import type { NutritionSummary, UserGoals } from '@/types'

/**
 * Scores how well a recipe's nutrition fills the *remaining* daily macros.
 * Returns a value 0–100. Higher = better fit.
 *
 * Strategy: for each macro with a goal, compute how close the recipe brings
 * the user to their target without going over. Penalize overshooting.
 */
export function macroFitScore(
  recipeNutrition: NutritionSummary,
  consumed: NutritionSummary,
  goals: UserGoals,
  recipeServings: number = 1
): number {
  const macros: Array<{
    consumed: number
    goal: number | null
    recipe: number
    weight: number
  }> = [
    { consumed: consumed.calories, goal: goals.calories, recipe: recipeNutrition.calories * recipeServings, weight: 2 },
    { consumed: consumed.proteinG, goal: goals.proteinG, recipe: recipeNutrition.proteinG * recipeServings, weight: 3 },
    { consumed: consumed.carbsG, goal: goals.carbsG, recipe: recipeNutrition.carbsG * recipeServings, weight: 1.5 },
    { consumed: consumed.fatG, goal: goals.fatG, recipe: recipeNutrition.fatG * recipeServings, weight: 1.5 },
  ]

  const activeMacros = macros.filter((m) => m.goal && m.goal > 0)
  if (activeMacros.length === 0) return 50 // no goals set, neutral score

  let totalScore = 0
  let totalWeight = 0

  for (const m of activeMacros) {
    const remaining = (m.goal ?? 0) - m.consumed
    if (remaining <= 0) {
      // Already at or over goal — penalize if recipe adds more
      const penalty = m.recipe > 0 ? Math.max(0, 100 - (m.recipe / (m.goal ?? 1)) * 200) : 80
      totalScore += penalty * m.weight
    } else {
      // Score based on how well recipe fills the remaining gap (sweet spot: 60–100%)
      const fillPct = (m.recipe / remaining) * 100
      let score: number
      if (fillPct <= 0) {
        score = 20
      } else if (fillPct <= 60) {
        // Under-fills — partial score
        score = 40 + (fillPct / 60) * 30
      } else if (fillPct <= 100) {
        // Good fit — high score
        score = 70 + ((fillPct - 60) / 40) * 30
      } else if (fillPct <= 130) {
        // Slight overshoot — mild penalty
        score = 100 - ((fillPct - 100) / 30) * 30
      } else {
        // Large overshoot
        score = Math.max(0, 70 - ((fillPct - 130) / 70) * 70)
      }
      totalScore += score * m.weight
    }
    totalWeight += m.weight
  }

  return Math.round(totalScore / totalWeight)
}

/**
 * Returns a label and color class for a fit score.
 */
export function fitScoreLabel(score: number): {
  label: string
  color: string
  bgColor: string
} {
  if (score >= 80) return { label: 'Great fit', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' }
  if (score >= 60) return { label: 'Good fit', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' }
  if (score >= 40) return { label: 'Okay fit', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200' }
  return { label: 'Poor fit', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' }
}

/**
 * Computes total consumed nutrition for a specific day from a weekly plan's entries.
 */
export function computeDayNutrition(
  entries: Array<{
    date: string
    servings: number
    recipe: { servings: number; nutrition: NutritionSummary }
  }>,
  date: string
): NutritionSummary {
  const dayEntries = entries.filter((e) => e.date === date)

  return dayEntries.reduce(
    (acc, entry) => {
      const scale = entry.servings
      return {
        calories: acc.calories + entry.recipe.nutrition.calories * scale,
        proteinG: acc.proteinG + entry.recipe.nutrition.proteinG * scale,
        carbsG: acc.carbsG + entry.recipe.nutrition.carbsG * scale,
        fatG: acc.fatG + entry.recipe.nutrition.fatG * scale,
        fiberG: acc.fiberG + entry.recipe.nutrition.fiberG * scale,
        perServing: false,
      }
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, perServing: false }
  )
}
