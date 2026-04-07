import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recipeSchema } from '@/lib/validations/recipe'
import { calculateRecipeNutrition } from '@/lib/utils/nutrition'
import type { RecipeDetail } from '@/types'

const RECIPE_SELECT = {
  id: true,
  title: true,
  description: true,
  instructions: true,
  prepTime: true,
  cookTime: true,
  servings: true,
  imageUrl: true,
  tags: true,
  isPublic: true,
  scrapedCalories: true,
  scrapedProteinG: true,
  scrapedCarbsG: true,
  scrapedFatG: true,
  scrapedFiberG: true,
  scrapedServingSize: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, image: true } },
  ingredients: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
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
          calories: true,
          proteinG: true,
          carbsG: true,
          fatG: true,
          fiberG: true,
          sodiumMg: true,
        },
      },
    },
  },
}

function toRecipeDetail(recipe: Awaited<ReturnType<typeof prisma.recipe.findUnique>>): RecipeDetail {
  if (!recipe) throw new Error('Recipe not found')
  const r = recipe as typeof recipe & {
    author: { id: string; name: string | null; image: string | null }
    ingredients: Array<{
      id: string
      quantity: number
      unit: string
      notes: string | null
      sortOrder: number
      ingredient: {
        id: string
        name: string
        category: string | null
        calories: number | null
        proteinG: number | null
        carbsG: number | null
        fatG: number | null
        fiberG: number | null
        sodiumMg: number | null
      }
    }>
  }
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    nutrition: calculateRecipeNutrition(r.ingredients, r.servings),
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const tagsParam = searchParams.get('tags')
  const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : []
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
  const skip = (page - 1) * limit

  const where = {
    OR: [{ authorId: session.user.id }, { isPublic: true }],
    ...(search && {
      title: { contains: search, mode: 'insensitive' as const },
    }),
    ...(tags.length && { tags: { hasSome: tags } }),
  }

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: RECIPE_SELECT,
    }),
    prisma.recipe.count({ where }),
  ])

  return NextResponse.json({
    recipes: recipes.map(toRecipeDetail),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = recipeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { ingredients: rawIngredients, ...recipeData } = parsed.data

    // Deduplicate by name — RecipeIngredient has @@unique([recipeId, ingredientId]).
    // The same ingredient in two sections (e.g. vanilla in batter AND topping)
    // would map to one Ingredient row and violate that constraint. Merge by summing qty.
    const seen = new Map<string, typeof rawIngredients[number]>()
    for (const ing of rawIngredients) {
      const key = ing.ingredientName.toLowerCase().trim()
      const existing = seen.get(key)
      if (existing) {
        existing.quantity += ing.quantity
      } else {
        seen.set(key, { ...ing })
      }
    }
    const ingredients = Array.from(seen.values())

    // Upsert ingredients by name
    const ingredientRecords = await Promise.all(
      ingredients.map((ing) =>
        prisma.ingredient.upsert({
          where: { name: ing.ingredientName.toLowerCase().trim() },
          create: { name: ing.ingredientName.toLowerCase().trim() },
          update: {},
        })
      )
    )

    const recipe = await prisma.recipe.create({
      data: {
        ...recipeData,
        authorId: session.user.id,
        ingredients: {
          create: ingredients.map((ing, idx) => ({
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
            group: ing.group,
            sortOrder: idx,
            ingredientId: ingredientRecords[idx].id,
          })),
        },
      },
      select: RECIPE_SELECT,
    })

    return NextResponse.json(toRecipeDetail(recipe), { status: 201 })
  } catch (err) {
    console.error('[POST /api/recipes]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
