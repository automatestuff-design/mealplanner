'use client'

import { useGoals } from '@/hooks/useGoals'
import { MacroProgressBar } from '@/components/goals/MacroProgressBar'
import { computeDayNutrition } from '@/lib/utils/macroFit'
import type { WeeklyPlan } from '@/types'

interface DayMacroSummaryProps {
  plan: WeeklyPlan | null
  selectedDate: string
}

export function DayMacroSummary({ plan, selectedDate }: DayMacroSummaryProps) {
  const { data: goals } = useGoals()

  const hasGoals = goals && (goals.calories || goals.proteinG || goals.carbsG || goals.fatG)
  if (!hasGoals || !plan) return null

  const consumed = computeDayNutrition(plan.entries, selectedDate)

  return (
    <MacroProgressBar consumed={consumed} goals={goals} />
  )
}
