import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/Header'
import { GroceryList } from '@/components/grocery/GroceryList'
import { GroceryListSelector } from './GroceryListSelector'
import { getWeekStart, toISODate } from '@/lib/utils/date'
import type { GroceryItem, GroceryList as GroceryListType } from '@/types'

async function getGroceryData(userId: string, mealPlanId?: string): Promise<{
  plans: Array<{ id: string; name: string | null; weekStart: string }>
  groceryList: GroceryListType | null
}> {
  const plans = await prisma.mealPlan.findMany({
    where: { userId },
    orderBy: { weekStart: 'desc' },
    take: 10,
    select: { id: true, name: true, weekStart: true },
  })

  const planSummaries = plans.map((p) => ({
    ...p,
    weekStart: toISODate(p.weekStart),
  }))

  if (!mealPlanId && plans.length === 0) {
    return { plans: planSummaries, groceryList: null }
  }

  const targetPlanId = mealPlanId ?? plans[0]?.id
  if (!targetPlanId) return { plans: planSummaries, groceryList: null }

  const plan = await prisma.mealPlan.findFirst({
    where: { id: targetPlanId, userId },
    include: {
      entries: {
        include: {
          recipe: {
            select: {
              servings: true,
              ingredients: {
                include: {
                  ingredient: {
                    select: { id: true, name: true, category: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!plan) return { plans: planSummaries, groceryList: null }

  // Consolidate ingredients
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

  return {
    plans: planSummaries,
    groceryList: {
      mealPlanId: plan.id,
      weekStart: toISODate(plan.weekStart),
      sections,
    },
  }
}

export default async function GroceryListPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string }>
}) {
  const session = await auth()
  const params = await searchParams
  const { plans, groceryList } = await getGroceryData(
    session!.user!.id as string,
    params.planId
  )

  const totalItems = groceryList?.sections.reduce((sum, s) => sum + s.items.length, 0) ?? 0

  return (
    <div>
      <Header title="Grocery List" />
      <div className="p-6 max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <GroceryListSelector plans={plans} currentPlanId={params.planId ?? plans[0]?.id} />
        </div>

        {groceryList && groceryList.sections.length > 0 ? (
          <GroceryList groceryList={groceryList} />
        ) : (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            {plans.length === 0
              ? 'No meal plans yet. Create a meal plan first.'
              : 'No ingredients in this meal plan.'}
          </div>
        )}
      </div>
    </div>
  )
}
