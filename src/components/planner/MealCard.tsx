'use client'

import Link from 'next/link'
import { Clock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MealEntryWithRecipe } from '@/types'

interface MealCardProps {
  entry: MealEntryWithRecipe
  onRemove: (entryId: string) => void
}

export function MealCard({ entry, onRemove }: MealCardProps) {
  const totalTime = (entry.recipe.prepTime ?? 0) + (entry.recipe.cookTime ?? 0)

  return (
    <div className="group relative rounded-md border bg-card p-2 text-sm shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-1">
        <Link
          href={`/recipes/${entry.recipe.id}`}
          className="font-medium text-xs leading-tight hover:text-primary line-clamp-2 flex-1"
        >
          {entry.recipe.title}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(entry.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {totalTime > 0 && (
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {totalTime}m
          </span>
        )}
        <span>{entry.recipe.nutrition.calories} kcal</span>
        {entry.servings !== 1 && <span>×{entry.servings}</span>}
      </div>
    </div>
  )
}
