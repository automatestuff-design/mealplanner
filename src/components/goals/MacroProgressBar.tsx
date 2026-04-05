import { cn } from '@/lib/utils/cn'
import type { NutritionSummary, UserGoals } from '@/types'

interface MacroProgressBarProps {
  consumed: NutritionSummary
  goals: UserGoals
  compact?: boolean
}

interface BarProps {
  label: string
  consumed: number
  goal: number | null
  unit: string
  color: string
}

function Bar({ label, consumed, goal, unit, color }: BarProps) {
  const pct = goal && goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0
  const over = goal ? consumed > goal : false

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className={cn('text-muted-foreground', over && 'text-amber-600 font-medium')}>
          {consumed}{unit}
          {goal ? ` / ${goal}${unit}` : ''}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color, over && 'opacity-70')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function MacroProgressBar({ consumed, goals, compact = false }: MacroProgressBarProps) {
  const hasGoals =
    goals.calories || goals.proteinG || goals.carbsG || goals.fatG

  if (!hasGoals) return null

  if (compact) {
    // Single line summary for planner cells
    const calPct = goals.calories
      ? Math.round((consumed.calories / goals.calories) * 100)
      : null

    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full bg-primary transition-all',
              calPct && calPct > 100 && 'bg-amber-500'
            )}
            style={{ width: `${Math.min(calPct ?? 0, 100)}%` }}
          />
        </div>
        <span>
          {consumed.calories}
          {goals.calories ? `/${goals.calories}` : ''} kcal
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Daily Progress</h3>
      <Bar
        label="Calories"
        consumed={consumed.calories}
        goal={goals.calories}
        unit=" kcal"
        color="bg-orange-400"
      />
      <Bar
        label="Protein"
        consumed={consumed.proteinG}
        goal={goals.proteinG}
        unit="g"
        color="bg-blue-500"
      />
      <Bar
        label="Carbs"
        consumed={consumed.carbsG}
        goal={goals.carbsG}
        unit="g"
        color="bg-yellow-400"
      />
      <Bar
        label="Fat"
        consumed={consumed.fatG}
        goal={goals.fatG}
        unit="g"
        color="bg-red-400"
      />
      {goals.fiberG && (
        <Bar
          label="Fiber"
          consumed={consumed.fiberG}
          goal={goals.fiberG}
          unit="g"
          color="bg-green-500"
        />
      )}
    </div>
  )
}
