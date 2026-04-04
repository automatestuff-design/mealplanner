'use client'

import { Plus } from 'lucide-react'
import { MealCard } from './MealCard'
import type { MealEntryWithRecipe, MealType } from '@/types'

interface MealSlotProps {
  date: string
  mealType: MealType
  entries: MealEntryWithRecipe[]
  onAdd: (date: string, mealType: MealType) => void
  onRemove: (entryId: string) => void
}

export function MealSlot({ date, mealType, entries, onAdd, onRemove }: MealSlotProps) {
  return (
    <div className="min-h-[80px] space-y-1">
      {entries.map((entry) => (
        <MealCard key={entry.id} entry={entry} onRemove={onRemove} />
      ))}
      <button
        onClick={() => onAdd(date, mealType)}
        className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed p-1.5 text-xs text-muted-foreground opacity-0 hover:opacity-100 hover:border-primary hover:text-primary transition-opacity focus:opacity-100"
      >
        <Plus className="h-3 w-3" />
        Add
      </button>
    </div>
  )
}
