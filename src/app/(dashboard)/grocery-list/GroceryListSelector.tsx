'use client'

import { useRouter } from 'next/navigation'

interface Plan {
  id: string
  name: string | null
  weekStart: string
}

interface GroceryListSelectorProps {
  plans: Plan[]
  currentPlanId?: string
}

export function GroceryListSelector({ plans, currentPlanId }: GroceryListSelectorProps) {
  const router = useRouter()

  if (plans.length === 0) return null

  const formatLabel = (plan: Plan) => {
    const date = new Date(plan.weekStart + 'T00:00:00Z')
    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    return plan.name ?? `Week of ${formatted}`
  }

  return (
    <select
      value={currentPlanId ?? ''}
      onChange={(e) => router.push(`/grocery-list?planId=${e.target.value}`)}
      className="flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {plans.map((plan) => (
        <option key={plan.id} value={plan.id}>
          {formatLabel(plan)}
        </option>
      ))}
    </select>
  )
}
