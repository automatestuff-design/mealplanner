import type { GroceryItem, GroceryList, MealEntryWithRecipe } from '@/types'

type EntryWithIngredients = MealEntryWithRecipe & {
  recipe: MealEntryWithRecipe['recipe'] & {
    ingredients: Array<{
      id: string
      quantity: number
      unit: string
      notes: string | null
      ingredient: {
        id: string
        name: string
        category: string | null
      }
      recipeServings: number
    }>
  }
}

export function generateGroceryList(
  mealPlanId: string,
  weekStart: string,
  entries: EntryWithIngredients[]
): GroceryList {
  // Map: ingredientId -> consolidated item
  const consolidated = new Map<string, GroceryItem>()

  for (const entry of entries) {
    for (const ri of entry.recipe.ingredients) {
      const scaledQty = ri.quantity * (entry.servings / ri.recipeServings)
      const existing = consolidated.get(ri.ingredient.id)

      if (existing) {
        // Find matching unit or add new quantity entry
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
    const category = item.category ?? 'Other'
    if (!categoryMap.has(category)) {
      categoryMap.set(category, [])
    }
    categoryMap.get(category)!.push(item)
  }

  // Sort categories and items within each category
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

  return { mealPlanId, weekStart, sections }
}
