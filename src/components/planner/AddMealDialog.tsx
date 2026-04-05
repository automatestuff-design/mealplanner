'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useGoals } from '@/hooks/useGoals'
import { computeDayNutrition, macroFitScore, fitScoreLabel } from '@/lib/utils/macroFit'
import { cn } from '@/lib/utils/cn'
import type { MealType, MealEntryWithRecipe, RecipeDetail } from '@/types'

interface AddMealDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (recipeId: string, servings: number) => void
  date: string
  mealType: MealType
  consumedOnDate: MealEntryWithRecipe[]
}

export function AddMealDialog({
  open,
  onClose,
  onAdd,
  date,
  mealType,
  consumedOnDate,
}: AddMealDialogProps) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<RecipeDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [servings, setServings] = useState(1)

  const { data: goals } = useGoals()

  const handleSearch = async () => {
    if (!search.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/recipes?search=${encodeURIComponent(search)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.recipes)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const mealTypeLabel = mealType.charAt(0) + mealType.slice(1).toLowerCase()
  const dateLabel = new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

  const hasGoals = goals && (goals.calories || goals.proteinG || goals.carbsG || goals.fatG)
  const consumed = computeDayNutrition(consumedOnDate, date)

  // Sort results by fit score if goals exist
  const sortedResults = hasGoals
    ? [...results].sort(
        (a, b) =>
          macroFitScore(b.nutrition, consumed, goals!, servings) -
          macroFitScore(a.nutrition, consumed, goals!, servings)
      )
    : results

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Add {mealTypeLabel} — {dateLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button onClick={handleSearch} disabled={loading} size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">Servings:</label>
            <Input
              type="number"
              value={servings}
              onChange={(e) => setServings(Math.max(0.5, parseFloat(e.target.value) || 1))}
              className="w-20"
              min={0.5}
              step={0.5}
            />
          </div>

          {sortedResults.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-auto">
              {hasGoals && (
                <p className="text-xs text-muted-foreground px-1">
                  Sorted by how well each recipe fills your remaining daily goals
                </p>
              )}
              {sortedResults.map((recipe) => {
                const score = hasGoals
                  ? macroFitScore(recipe.nutrition, consumed, goals!, servings)
                  : null
                const fit = score !== null ? fitScoreLabel(score) : null

                return (
                  <div
                    key={recipe.id}
                    className={cn(
                      'flex items-center justify-between rounded-md border p-3 hover:bg-accent cursor-pointer transition-colors',
                      fit && fit.bgColor
                    )}
                    onClick={() => {
                      onAdd(recipe.id, servings)
                      onClose()
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{recipe.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {recipe.nutrition.calories * servings} kcal · {recipe.nutrition.proteinG * servings}g protein
                      </div>
                    </div>
                    {fit && score !== null && (
                      <div className={cn('ml-3 shrink-0 text-xs font-medium', fit.color)}>
                        {fit.label}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {sortedResults.length === 0 && search && !loading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recipes found. Try a different search.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
