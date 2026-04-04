import type { NutritionSummary } from '@/types'

interface NutritionBadgeProps {
  nutrition: NutritionSummary
  compact?: boolean
}

export function NutritionBadge({ nutrition, compact = false }: NutritionBadgeProps) {
  if (compact) {
    return (
      <span className="text-xs text-muted-foreground">
        {nutrition.calories} kcal{nutrition.perServing ? '/serving' : ''}
      </span>
    )
  }

  return (
    <div className="grid grid-cols-5 gap-2 rounded-lg bg-muted p-3 text-center text-xs">
      <div>
        <div className="font-semibold text-foreground">{nutrition.calories}</div>
        <div className="text-muted-foreground">kcal</div>
      </div>
      <div>
        <div className="font-semibold text-foreground">{nutrition.proteinG}g</div>
        <div className="text-muted-foreground">protein</div>
      </div>
      <div>
        <div className="font-semibold text-foreground">{nutrition.carbsG}g</div>
        <div className="text-muted-foreground">carbs</div>
      </div>
      <div>
        <div className="font-semibold text-foreground">{nutrition.fatG}g</div>
        <div className="text-muted-foreground">fat</div>
      </div>
      <div>
        <div className="font-semibold text-foreground">{nutrition.fiberG}g</div>
        <div className="text-muted-foreground">fiber</div>
      </div>
    </div>
  )
}
