import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateRecipeNutrition } from '@/lib/utils/nutrition'
import { macroFitScore } from '@/lib/utils/macroFit'
import { getWeekDays, toISODate, fromISODate } from '@/lib/utils/date'
import type { NutritionSummary, UserGoals, MealType } from '@/types'

const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']

const ZERO_NUTRITION: NutritionSummary = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  perServing: false,
}

function addNutrition(a: NutritionSummary, b: NutritionSummary): NutritionSummary {
  return {
    calories: a.calories + b.calories,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
    fiberG: a.fiberG + b.fiberG,
    perServing: false,
  }
}

/**
 * POST /api/meal-plans/suggest
 * Body: { weekStart: string }  (YYYY-MM-DD, must be a Monday)
 *
 * Generates a macro-optimised weekly meal plan by greedily assigning the
 * best-fitting recipe to each meal slot, then replaces the current week's
 * entries with the suggestions.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id as string

  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let weekStart: string
  try {
    const body = await req.json()
    weekStart = body.weekStart
    if (!weekStart) throw new Error()
  } catch {
    return NextResponse.json({ error: 'weekStart is required' }, { status: 400 })
  }

  // ── 2. Load user goals ─────────────────────────────────────────────────────
  const goals = await prisma.userGoals.findUnique({ where: { userId } })

  if (!goals || (!goals.calories && !goals.proteinG && !goals.carbsG && !goals.fatG)) {
    return NextResponse.json(
      { error: 'Set your macro goals first (Macro Goals page) before generating a suggestion.' },
      { status: 422 }
    )
  }

  const goalsForFit: UserGoals = {
    calories: goals.calories,
    proteinG: goals.proteinG,
    carbsG: goals.carbsG,
    fatG: goals.fatG,
    fiberG: goals.fiberG,
  }

  // ── 3. Load recipes with ingredient nutrition ──────────────────────────────
  const dbRecipes = await prisma.recipe.findMany({
    where: { OR: [{ authorId: userId }, { isPublic: true }] },
    select: {
      id: true,
      title: true,
      servings: true,
      scrapedCalories: true,
      scrapedProteinG: true,
      scrapedCarbsG: true,
      scrapedFatG: true,
      scrapedFiberG: true,
      ingredients: {
        select: {
          quantity: true,
          unit: true,
          notes: true,
          group: true,
          sortOrder: true,
          ingredient: {
            select: {
              id: true,
              name: true,
              category: true,
              sodiumMg: true,
              calories: true,
              proteinG: true,
              carbsG: true,
              fatG: true,
              fiberG: true,
            },
          },
        },
      },
    },
  })

  if (dbRecipes.length === 0) {
    return NextResponse.json(
      { error: 'Add some recipes first before generating a suggestion.' },
      { status: 422 }
    )
  }

  // ── 4. Resolve per-serving nutrition for each recipe ───────────────────────
  type ScoredRecipe = { id: string; nutrition: NutritionSummary }

  const recipes: ScoredRecipe[] = dbRecipes.map((r) => {
    const calculated = calculateRecipeNutrition(
      r.ingredients.map((ri) => ({ ...ri, id: ri.ingredient.id })),
      r.servings
    )

    // Fall back to scraped data if ingredient-based calculation has no data
    const hasIngredientData = calculated.calories > 0 || calculated.proteinG > 0
    const nutrition: NutritionSummary = hasIngredientData
      ? calculated
      : {
          calories: r.scrapedCalories ?? 0,
          proteinG: r.scrapedProteinG ?? 0,
          carbsG: r.scrapedCarbsG ?? 0,
          fatG: r.scrapedFatG ?? 0,
          fiberG: r.scrapedFiberG ?? 0,
          perServing: true,
        }

    return { id: r.id, nutrition }
  })

  // Prefer recipes with actual nutrition data; fall back to all if none have data
  const scorable = recipes.filter((r) => r.nutrition.calories > 0 || r.nutrition.proteinG > 0)
  const candidates = scorable.length > 0 ? scorable : recipes

  // ── 5. Greedy slot-filling algorithm ──────────────────────────────────────
  // For each day: iterate BREAKFAST → LUNCH → DINNER → SNACK.
  // Score each recipe against remaining daily macros, prefer variety.
  type EntryInput = { date: string; mealType: MealType; recipeId: string; servings: number }
  const suggested: EntryInput[] = []
  const weekUsage = new Map<string, number>() // recipeId → times used this week

  const weekStartDate = fromISODate(weekStart)
  const days = getWeekDays(weekStartDate)

  for (const day of days) {
    const dateStr = toISODate(day)
    let accumulated = { ...ZERO_NUTRITION }
    const usedToday = new Set<string>()

    for (const mealType of MEAL_TYPES) {
      // Score candidates not already used today; fall back to all if needed
      const pool =
        candidates.filter((r) => !usedToday.has(r.id)).length > 0
          ? candidates.filter((r) => !usedToday.has(r.id))
          : candidates

      const best = pool
        .map((r) => {
          const raw = macroFitScore(r.nutrition, accumulated, goalsForFit, 1)
          // Penalise repetition: used 1× → 80%, 2× → 55%, 3+× → 25%
          const uses = weekUsage.get(r.id) ?? 0
          const penalty = uses === 0 ? 1 : uses === 1 ? 0.8 : uses === 2 ? 0.55 : 0.25
          return { r, score: raw * penalty }
        })
        .sort((a, b) => b.score - a.score)[0]

      if (!best) continue

      suggested.push({ date: dateStr, mealType, recipeId: best.r.id, servings: 1 })
      usedToday.add(best.r.id)
      weekUsage.set(best.r.id, (weekUsage.get(best.r.id) ?? 0) + 1)
      accumulated = addNutrition(accumulated, best.r.nutrition)
    }
  }

  // ── 6. Persist: upsert plan, replace entries ───────────────────────────────
  const weekStartParsed = fromISODate(weekStart)

  const plan = await prisma.mealPlan.upsert({
    where: { userId_weekStart: { userId, weekStart: weekStartParsed } },
    create: { weekStart: weekStartParsed, userId },
    update: {},
  })

  await prisma.mealEntry.deleteMany({ where: { mealPlanId: plan.id } })

  await prisma.mealEntry.createMany({
    data: suggested.map((e) => ({
      date: fromISODate(e.date),
      mealType: e.mealType,
      servings: e.servings,
      mealPlanId: plan.id,
      recipeId: e.recipeId,
    })),
  })

  return NextResponse.json({ planId: plan.id })
}
