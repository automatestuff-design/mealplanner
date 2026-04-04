import type { GroceryList } from '@/types'

export async function fetchGroceryList(mealPlanId: string): Promise<GroceryList> {
  const res = await fetch(`/api/grocery-list?mealPlanId=${mealPlanId}`)
  if (!res.ok) throw new Error('Failed to fetch grocery list')
  return res.json()
}
