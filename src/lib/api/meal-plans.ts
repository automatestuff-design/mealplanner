import type { WeeklyPlan } from '@/types'
import type { CreateMealPlanInput, MealEntryInput } from '@/lib/validations/meal-plan'

export async function fetchMealPlan(weekStart: string): Promise<WeeklyPlan | null> {
  const res = await fetch(`/api/meal-plans?weekStart=${weekStart}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch meal plan')
  return res.json()
}

export async function createMealPlan(data: CreateMealPlanInput): Promise<WeeklyPlan> {
  const res = await fetch('/api/meal-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Failed to create meal plan')
  }
  return res.json()
}

export async function addMealEntry(
  planId: string,
  data: MealEntryInput
): Promise<WeeklyPlan> {
  const res = await fetch(`/api/meal-plans/${planId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Failed to add meal entry')
  }
  return res.json()
}

export async function removeMealEntry(planId: string, entryId: string): Promise<void> {
  const res = await fetch(`/api/meal-plans/${planId}/entries/${entryId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to remove meal entry')
}
