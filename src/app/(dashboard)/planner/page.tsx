import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/Header'
import { WeeklyCalendar } from '@/components/planner/WeeklyCalendar'
import { PlannerClient } from './PlannerClient'
import { getWeekStart, toISODate } from '@/lib/utils/date'
import { calculateRecipeNutrition } from '@/lib/utils/nutrition'
import type { WeeklyPlan, MealType, MealEntryWithRecipe } from '@/types'

async function getMealPlan(userId: string, weekStart: Date): Promise<WeeklyPlan | null> {
  const plan = await prisma.mealPlan.findFirst({
    where: { userId, weekStart },
    include: {
      entries: {
        include: {
          recipe: {
            select: {
              id: true,
              title: true,
              prepTime: true,
              cookTime: true,
              imageUrl: true,
              servings: true,
              ingredients: {
                select: {
                  quantity: true,
                  unit: true,
                  ingredient: {
                    select: {
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
          },
        },
      },
    },
  })

  if (!plan) return null

  const entries: MealEntryWithRecipe[] = plan.entries.map((e) => ({
    id: e.id,
    date: toISODate(e.date),
    mealType: e.mealType as MealType,
    servings: e.servings,
    notes: e.notes,
    recipe: {
      id: e.recipe.id,
      title: e.recipe.title,
      prepTime: e.recipe.prepTime,
      cookTime: e.recipe.cookTime,
      imageUrl: e.recipe.imageUrl,
      servings: e.recipe.servings,
      nutrition: calculateRecipeNutrition(
        e.recipe.ingredients.map((ri) => ({
          id: '',
          quantity: ri.quantity,
          unit: ri.unit,
          notes: null,
          sortOrder: 0,
          ingredient: {
            id: '',
            name: '',
            category: null,
            sodiumMg: null,
            calories: ri.ingredient.calories,
            proteinG: ri.ingredient.proteinG,
            carbsG: ri.ingredient.carbsG,
            fatG: ri.ingredient.fatG,
            fiberG: ri.ingredient.fiberG,
          },
        })),
        e.recipe.servings
      ),
    },
  }))

  const days: WeeklyPlan['days'] = {}
  for (const entry of entries) {
    if (!days[entry.date]) days[entry.date] = {}
    const mt = entry.mealType
    if (!days[entry.date][mt]) days[entry.date][mt] = []
    days[entry.date][mt]!.push(entry)
  }

  return {
    id: plan.id,
    weekStart: toISODate(plan.weekStart),
    name: plan.name,
    days,
    entries,
  }
}

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const session = await auth()
  const params = await searchParams
  const weekStartDate = params.week ? new Date(`${params.week}T00:00:00Z`) : getWeekStart()
  const weekStart = toISODate(weekStartDate)
  const plan = await getMealPlan(session!.user!.id as string, weekStartDate)

  return (
    <div>
      <Header title="Meal Planner" />
      <div className="p-6">
        <PlannerClient initialPlan={plan} weekStart={weekStart} />
      </div>
    </div>
  )
}
