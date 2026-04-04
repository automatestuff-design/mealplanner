'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { GroceryList as GroceryListType, GroceryItem } from '@/types'

interface GroceryListProps {
  groceryList: GroceryListType
}

export function GroceryList({ groceryList }: GroceryListProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  const toggleItem = (ingredientId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(ingredientId)) {
        next.delete(ingredientId)
      } else {
        next.add(ingredientId)
      }
      return next
    })
  }

  const totalItems = groceryList.sections.reduce((sum, s) => sum + s.items.length, 0)
  const checkedCount = checkedItems.size

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {checkedCount} of {totalItems} items checked
        </span>
        {checkedCount > 0 && (
          <button
            onClick={() => setCheckedItems(new Set())}
            className="text-xs hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>

      {groceryList.sections.map((section) => (
        <div key={section.category}>
          <h3 className="font-semibold capitalize text-sm mb-2 text-muted-foreground uppercase tracking-wide">
            {section.category}
          </h3>
          <div className="space-y-1">
            {section.items.map((item) => (
              <GroceryItemRow
                key={item.ingredientId}
                item={item}
                checked={checkedItems.has(item.ingredientId)}
                onToggle={() => toggleItem(item.ingredientId)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface GroceryItemRowProps {
  item: GroceryItem
  checked: boolean
  onToggle: () => void
}

function GroceryItemRow({ item, checked, onToggle }: GroceryItemRowProps) {
  const quantityStr = item.quantities
    .map((q) => `${q.amount} ${q.unit}`)
    .join(' + ')

  return (
    <div
      onClick={onToggle}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-accent transition-colors',
        checked && 'opacity-50'
      )}
    >
      <div
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
          checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'
        )}
      >
        {checked && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
      <span className={cn('flex-1 capitalize text-sm', checked && 'line-through')}>
        {item.name}
      </span>
      <span className="text-sm text-muted-foreground">{quantityStr}</span>
    </div>
  )
}
