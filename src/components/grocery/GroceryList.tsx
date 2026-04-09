'use client'

import { useState } from 'react'
import { Check, ShoppingCart, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { amazonSearchUrl, walmartSearchUrl } from '@/lib/integrations/affiliate'
import type { GroceryList as GroceryListType, GroceryItem } from '@/types'

// ─── Instacart shop panel ─────────────────────────────────────────────────────

interface ShopPanelProps {
  groceryList: GroceryListType
  instacartEnabled: boolean
}

function ShopPanel({ groceryList, instacartEnabled }: ShopPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allItems = groceryList.sections.flatMap((s) =>
    s.items.flatMap((item) =>
      item.quantities.map((q) => ({
        name: item.name,
        quantity: q.amount,
        unit: q.unit,
      }))
    )
  )

  const handleInstacart = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/grocery-list/instacart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: allItems,
          listTitle: `Meal Plan – Week of ${groceryList.weekStart}`,
          linkbackUrl: window.location.href,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create Instacart list')
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Shop this list</p>

      <div className="flex flex-wrap gap-2">
        {instacartEnabled ? (
          <Button
            onClick={handleInstacart}
            disabled={loading}
            className="bg-[#0aad0a] hover:bg-[#089a08] text-white gap-2"
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            {loading ? 'Opening Instacart…' : 'Order with Instacart'}
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://www.instacart.com/store`}
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Shop on Instacart
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </Button>
        )}

        <Button variant="outline" size="sm" asChild>
          <a
            href={amazonSearchUrl(allItems.map((i) => i.name).slice(0, 3).join(', '))}
            target="_blank"
            rel="noopener noreferrer"
            className="gap-1"
          >
            Amazon Fresh
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        </Button>

        <Button variant="outline" size="sm" asChild>
          <a
            href={walmartSearchUrl('grocery')}
            target="_blank"
            rel="noopener noreferrer"
            className="gap-1"
          >
            Walmart Grocery
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {instacartEnabled && (
        <p className="text-xs text-muted-foreground">
          Instacart pre-fills your cart across 1,500+ stores. Amazon and Walmart open a search page.
        </p>
      )}
    </div>
  )
}

// ─── Main grocery list ────────────────────────────────────────────────────────

interface GroceryListProps {
  groceryList: GroceryListType
  instacartEnabled: boolean
}

export function GroceryList({ groceryList, instacartEnabled }: GroceryListProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  const toggleItem = (ingredientId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(ingredientId)) next.delete(ingredientId)
      else next.add(ingredientId)
      return next
    })
  }

  const totalItems = groceryList.sections.reduce((sum, s) => sum + s.items.length, 0)
  const checkedCount = checkedItems.size

  return (
    <div className="space-y-6">
      {/* Shop panel */}
      <ShopPanel groceryList={groceryList} instacartEnabled={instacartEnabled} />

      {/* Progress + clear */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{checkedCount} of {totalItems} items checked</span>
        {checkedCount > 0 && (
          <button onClick={() => setCheckedItems(new Set())} className="text-xs hover:text-foreground">
            Clear all
          </button>
        )}
      </div>

      {/* Sections */}
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

// ─── Individual item row ──────────────────────────────────────────────────────

interface GroceryItemRowProps {
  item: GroceryItem
  checked: boolean
  onToggle: () => void
}

function GroceryItemRow({ item, checked, onToggle }: GroceryItemRowProps) {
  const quantityStr = item.quantities.map((q) => `${q.amount} ${q.unit}`).join(' + ')

  return (
    <div className={cn('flex items-center gap-3 rounded-md px-3 py-2 group', checked && 'opacity-50')}>
      {/* Checkbox */}
      <div
        onClick={onToggle}
        className={cn(
          'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-colors',
          checked ? 'bg-primary border-primary' : 'border-muted-foreground/40 hover:border-primary'
        )}
      >
        {checked && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>

      {/* Name — clicking also toggles */}
      <span
        onClick={onToggle}
        className={cn('flex-1 capitalize text-sm cursor-pointer', checked && 'line-through')}
      >
        {item.name}
      </span>

      {/* Quantity */}
      <span className="text-sm text-muted-foreground">{quantityStr}</span>

      {/* Per-item retailer search links */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={amazonSearchUrl(item.name)}
          target="_blank"
          rel="noopener noreferrer"
          title={`Search "${item.name}" on Amazon`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent"
        >
          AMZ
        </a>
        <a
          href={walmartSearchUrl(item.name)}
          target="_blank"
          rel="noopener noreferrer"
          title={`Search "${item.name}" on Walmart`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent"
        >
          WMT
        </a>
      </div>
    </div>
  )
}
