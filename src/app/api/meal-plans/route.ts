import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createMealPlanSchema } from '@/lib/validations/meal-plan'
import { calculateRecipeNutrition } from '@/lib/utils/nutrition'
import { toISODate, fromISODate } from '@/lib/utils/date'
import type { WeeklyPlan, MealType, MealEntryWithRecipe } from '@/types'

const ENTRY_SELECT = {
  id: true,
  date: true,
  mealType: true,
  servings: true,
  notes: true,
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
}

function buildWeeklyPlan(plan: {
  id: string
  weekStart: Date
  name: string | null
  entries: Array<{
    id: string
    date: Date
    mealType: string
    servings: number
    notes: string | null
    recipe: {
      id: string
      title: string
      prepTime: number | null
      cookTime: number | null
      imageUrl: string | null
      servings: number
      ingredients: Array<{
        quantity: number
        unit: string
        ingredient: {
          calories: number | null
          proteinG: number | null
          carbsG: number | null
          fatG: number | null
          fiberG: number | null
        }
      }>
    }
  }>
}): WeeklyPlan {
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
          ...ri,
          id: '',
          notes: null,
          sortOrder: 0,
          ingredient: {
            ...ri.ingredient,
            id: '',
            name: '',
            category: null,
            sodiumMg: null,
          },
        })),
        e.recipe.servings
      ),
    },
  }))

  const days: WeeklyPlan['days'] = {}
  for (const entry of entries) {
    if (!days[entry.date]) days[entry.date] = {}
    const mealType = entry.mealType
    if (!days[entry.date][mealType]) days[entry.date][mealType] = []
    days[entry.date][mealType]!.push(entry)
  }

  return {
    id: plan.id,
    weekStart: toISODate(plan.weekStart),
    name: plan.name,
    days,
    entries,
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const weekStartParam = searchParams.get('weekStart')

  const where = weekStartParam
    ? { userId: session.user.id, weekStart: fromISODate(weekStartParam) }
    : { userId: session.user.id }

  const plan = weekStartParam
    ? await prisma.mealPlan.findFirst({ where, include: { entries: { select: ENTRY_SELECT } } })
    : await prisma.mealPlan.findFirst({
        where: { userId: session.user.id },
        orderBy: { weekStart: 'desc' },
        include: { entries: { select: ENTRY_SELECT } },
      })

  if (!plan) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
  }

  return NextResponse.json(buildWeeklyPlan(plan))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = createMealPlanSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const weekStart = fromISODate(parsed.data.weekStart)

    const plan = await prisma.mealPlan.upsert({
      where: { userId_weekStart: { userId: session.user.id, weekStart } },
      create: {
        weekStart,
        name: parsed.data.name,
        userId: session.user.id,
      },
      update: parsed.data.name ? { name: parsed.data.name } : {},
      include: { entries: { select: ENTRY_SELECT } },
    })

    return NextResponse.json(buildWeeklyPlan(plan), { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
