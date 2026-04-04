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
import type { MealType, RecipeDetail } from '@/types'

interface AddMealDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (recipeId: string, servings: number) => void
  date: string
  mealType: MealType
}

export function AddMealDialog({ open, onClose, onAdd, date, mealType }: AddMealDialogProps) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<RecipeDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [servings, setServings] = useState(1)

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

          {results.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-auto">
              {results.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-accent cursor-pointer"
                  onClick={() => {
                    onAdd(recipe.id, servings)
                    onClose()
                  }}
                >
                  <div>
                    <div className="font-medium text-sm">{recipe.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {recipe.nutrition.calories} kcal/serving
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && search && !loading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recipes found. Try a different search.
            </p>
          )}

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Servings:</label>
            <Input
              type="number"
              value={servings}
              onChange={(e) => setServings(Math.max(0.5, parseFloat(e.target.value) || 1))}
              className="w-20"
              min={0.5}
              step={0.5}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
