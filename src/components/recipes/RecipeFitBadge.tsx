'use client'

import { useGoals } from '@/hooks/useGoals'
import { macroFitScore, fitScoreLabel } from '@/lib/utils/macroFit'
import { cn } from '@/lib/utils/cn'
import type { NutritionSummary } from '@/types'

const ZERO_CONSUMED: NutritionSummary = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  perServing: false,
}

interface RecipeFitBadgeProps {
  nutrition: NutritionSummary
}

export function RecipeFitBadge({ nutrition }: RecipeFitBadgeProps) {
  const { data: goals } = useGoals()

  const hasGoals = goals && (goals.calories || goals.proteinG || goals.carbsG || goals.fatG)
  if (!hasGoals) return null

  const score = macroFitScore(nutrition, ZERO_CONSUMED, goals!)
  const fit = fitScoreLabel(score)

  return (
    <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded border', fit.color, fit.bgColor)}>
      {fit.label}
    </span>
  )
}
