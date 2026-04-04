import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateRecipeSchema } from '@/lib/validations/recipe'
import { calculateRecipeNutrition } from '@/lib/utils/nutrition'

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const recipe = await prisma.recipe.findFirst({
    where: {
      id,
      OR: [{ authorId: session.user.id }, { isPublic: true }],
    },
    select: RECIPE_SELECT,
  })

  if (!recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }

  return NextResponse.json({
    ...recipe,
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
    nutrition: calculateRecipeNutrition(recipe.ingredients, recipe.servings),
  })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.recipe.findFirst({
    where: { id, authorId: session.user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const parsed = updateRecipeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { ingredients, ...recipeData } = parsed.data

    // If ingredients are being updated, replace them all
    if (ingredients) {
      const ingredientRecords = await Promise.all(
        ingredients.map((ing) =>
          prisma.ingredient.upsert({
            where: { name: ing.ingredientName.toLowerCase().trim() },
            create: { name: ing.ingredientName.toLowerCase().trim() },
            update: {},
          })
        )
      )

      await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } })
      await prisma.recipeIngredient.createMany({
        data: ingredients.map((ing, idx) => ({
          recipeId: id,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes ?? null,
          sortOrder: idx,
          ingredientId: ingredientRecords[idx].id,
        })),
      })
    }

    const recipe = await prisma.recipe.update({
      where: { id },
      data: recipeData,
      select: RECIPE_SELECT,
    })

    return NextResponse.json({
      ...recipe,
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
      nutrition: calculateRecipeNutrition(recipe.ingredients, recipe.servings),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.recipe.findFirst({
    where: { id, authorId: session.user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }

  await prisma.recipe.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
