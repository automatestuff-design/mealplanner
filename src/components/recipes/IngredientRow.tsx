'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { IngredientSummary } from '@/types'

interface IngredientRowProps {
  index: number
  onRemove: () => void
  onChange: (value: {
    ingredientId: string
    ingredientName: string
    quantity: number
    unit: string
    notes?: string
  }) => void
  defaultValue?: {
    ingredientId: string
    ingredientName: string
    quantity: number
    unit: string
    notes?: string
  }
}

export function IngredientRow({ index, onRemove, onChange, defaultValue }: IngredientRowProps) {
  const [search, setSearch] = useState(defaultValue?.ingredientName ?? '')
  const [suggestions, setSuggestions] = useState<IngredientSummary[]>([])
  const [selected, setSelected] = useState<IngredientSummary | null>(null)
  const [quantity, setQuantity] = useState(defaultValue?.quantity?.toString() ?? '')
  const [unit, setUnit] = useState(defaultValue?.unit ?? 'g')
  const [notes, setNotes] = useState(defaultValue?.notes ?? '')
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    if (search.length < 2 || selected) return

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ingredients?search=${encodeURIComponent(search)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data)
          setShowSuggestions(true)
        }
      } catch {
        // ignore
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, selected])

  const handleSelect = (ing: IngredientSummary) => {
    setSelected(ing)
    setSearch(ing.name)
    setSuggestions([])
    setShowSuggestions(false)
    onChange({
      ingredientId: ing.id,
      ingredientName: ing.name,
      quantity: parseFloat(quantity) || 0,
      unit,
      notes: notes || undefined,
    })
  }

  const handleQuantityChange = (val: string) => {
    setQuantity(val)
    if (selected) {
      onChange({
        ingredientId: selected.id,
        ingredientName: selected.name,
        quantity: parseFloat(val) || 0,
        unit,
        notes: notes || undefined,
      })
    }
  }

  const handleUnitChange = (val: string) => {
    setUnit(val)
    if (selected) {
      onChange({
        ingredientId: selected.id,
        ingredientName: selected.name,
        quantity: parseFloat(quantity) || 0,
        unit: val,
        notes: notes || undefined,
      })
    }
  }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setSelected(null)
    onChange({
      ingredientId: '',
      ingredientName: val,
      quantity: parseFloat(quantity) || 0,
      unit,
      notes: notes || undefined,
    })
  }

  return (
    <div className="flex gap-2 items-start">
      <span className="flex h-10 w-6 items-center text-sm text-muted-foreground shrink-0">
        {index + 1}.
      </span>
      <div className="relative flex-1">
        <Input
          placeholder="Ingredient name"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-auto">
            {suggestions.map((s) => (
              <li
                key={s.id}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
                onMouseDown={() => handleSelect(s)}
              >
                <span className="font-medium">{s.name}</span>
                {s.category && (
                  <span className="ml-2 text-xs text-muted-foreground">{s.category}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Input
        type="number"
        placeholder="Qty"
        value={quantity}
        onChange={(e) => handleQuantityChange(e.target.value)}
        className="w-20"
        min={0}
        step="any"
      />
      <Input
        placeholder="Unit"
        value={unit}
        onChange={(e) => handleUnitChange(e.target.value)}
        className="w-20"
      />
      <Input
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="flex-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
