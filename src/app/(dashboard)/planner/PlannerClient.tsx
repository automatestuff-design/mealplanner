'use client'

import { useRouter } from 'next/navigation'
import { WeeklyCalendar } from '@/components/planner/WeeklyCalendar'
import type { WeeklyPlan } from '@/types'

interface PlannerClientProps {
  initialPlan: WeeklyPlan | null
  weekStart: string
}

export function PlannerClient({ initialPlan, weekStart }: PlannerClientProps) {
  const router = useRouter()

  const handleWeekChange = (newWeekStart: string) => {
    router.push(`/planner?week=${newWeekStart}`)
  }

  return (
    <WeeklyCalendar
      initialPlan={initialPlan}
      weekStart={weekStart}
      onWeekChange={handleWeekChange}
    />
  )
}
