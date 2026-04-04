import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toISODate } from '@/lib/utils/date'
import type { GroceryItem, GroceryList } from '@/types'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const mealPlanId = searchParams.get('mealPlanId')

  if (!mealPlanId) {
    return NextResponse.json({ error: 'mealPlanId is required' }, { status: 400 })
  }

  const plan = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, userId: session.user.id },
    include: {
      entries: {
        include: {
          recipe: {
            select: {
              servings: true,
              ingredients: {
                include: {
                  ingredient: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
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

  if (!plan) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
  }

  // Consolidate ingredients across all entries
  const consolidated = new Map<string, GroceryItem>()

  for (const entry of plan.entries) {
    for (const ri of entry.recipe.ingredients) {
      const scaledQty = ri.quantity * (entry.servings / entry.recipe.servings)
      const existing = consolidated.get(ri.ingredient.id)

      if (existing) {
        const unitEntry = existing.quantities.find((q) => q.unit === ri.unit)
        if (unitEntry) {
          unitEntry.amount = Math.round((unitEntry.amount + scaledQty) * 100) / 100
        } else {
          existing.quantities.push({ amount: Math.round(scaledQty * 100) / 100, unit: ri.unit })
        }
      } else {
        consolidated.set(ri.ingredient.id, {
          ingredientId: ri.ingredient.id,
          name: ri.ingredient.name,
          category: ri.ingredient.category,
          quantities: [{ amount: Math.round(scaledQty * 100) / 100, unit: ri.unit }],
          checked: false,
        })
      }
    }
  }

  // Group by category
  const categoryMap = new Map<string, GroceryItem[]>()
  for (const item of consolidated.values()) {
    const cat = item.category ?? 'Other'
    if (!categoryMap.has(cat)) categoryMap.set(cat, [])
    categoryMap.get(cat)!.push(item)
  }

  const categoryOrder = ['produce', 'meat', 'seafood', 'dairy', 'grains', 'pantry', 'Other']
  const sections = Array.from(categoryMap.entries())
    .sort(([a], [b]) => {
      const aIdx = categoryOrder.indexOf(a)
      const bIdx = categoryOrder.indexOf(b)
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b)
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }))

  const result: GroceryList = {
    mealPlanId: plan.id,
    weekStart: toISODate(plan.weekStart),
    sections,
  }

  return NextResponse.json(result)
}
