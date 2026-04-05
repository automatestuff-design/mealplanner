import type { UserGoals } from '@/types'
import type { UserGoalsInput } from '@/lib/validations/goals'

export async function fetchGoals(): Promise<UserGoals> {
  const res = await fetch('/api/goals')
  if (!res.ok) throw new Error('Failed to fetch goals')
  return res.json()
}

export async function saveGoals(data: UserGoalsInput): Promise<UserGoals> {
  const res = await fetch('/api/goals', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Failed to save goals')
  }
  return res.json()
}
