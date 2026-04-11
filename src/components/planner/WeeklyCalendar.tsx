'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ShoppingCart, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MealSlot } from './MealSlot'
import { AddMealDialog } from './AddMealDialog'
import { DayMacroSummary } from './DayMacroSummary'
import { ActivityWidget } from '@/components/activity/ActivityWidget'
import { computeDayNutrition } from '@/lib/utils/macroFit'
import { useGoals } from '@/hooks/useGoals'
import { formatWeekRange, getWeekDays, toISODate, formatDayLabel, getWeekStart, fromISODate } from '@/lib/utils/date'
import { addMealEntry, createMealPlan, removeMealEntry } from '@/lib/api/meal-plans'
import type { WeeklyPlan, MealType } from '@/types'

const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
}

interface WeeklyCalendarProps {
  initialPlan: WeeklyPlan | null
  weekStart: string
  onWeekChange: (weekStart: string) => void
}

export function WeeklyCalendar({ initialPlan, weekStart, onWeekChange }: WeeklyCalendarProps) {
  const [plan, setPlan] = useState<WeeklyPlan | null>(initialPlan)
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()))
  const { data: goals } = useGoals()
  const [dialogState, setDialogState] = useState<{
    open: boolean
    date: string
    mealType: MealType
  } | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)

  const weekStartDate = fromISODate(weekStart)
  const days = getWeekDays(weekStartDate)
  const today = new Date()

  const navigateWeek = (direction: -1 | 1) => {
    const next = new Date(weekStartDate)
    next.setUTCDate(next.getUTCDate() + direction * 7)
    onWeekChange(toISODate(getWeekStart(next)))
  }

  const handleAdd = useCallback((date: string, mealType: MealType) => {
    setSelectedDate(date)
    setDialogState({ open: true, date, mealType })
  }, [])

  const handleAddConfirm = async (recipeId: string, servings: number) => {
    if (!dialogState) return

    try {
      // Create the meal plan for this week on first use
      let activePlan = plan
      if (!activePlan) {
        activePlan = await createMealPlan({ weekStart })
        setPlan(activePlan)
      }

      await addMealEntry(activePlan.id, {
        date: dialogState.date,
        mealType: dialogState.mealType,
        recipeId,
        servings,
      })
      const res = await fetch(`/api/meal-plans?weekStart=${weekStart}`)
      if (res.ok) {
        const updated = await res.json()
        setPlan(updated)
      }
    } catch (err) {
      console.error('Failed to add meal entry', err)
    }
  }

  const handleSuggest = async () => {
    if (
      plan &&
      plan.entries.length > 0 &&
      !confirm('This will replace your current meal plan for this week. Continue?')
    )
      return

    setSuggesting(true)
    setSuggestError(null)
    try {
      const res = await fetch('/api/meal-plans/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate suggestion')
      // Refresh the plan
      const planRes = await fetch(`/api/meal-plans?weekStart=${weekStart}`)
      if (planRes.ok) setPlan(await planRes.json())
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSuggesting(false)
    }
  }

  const handleRemove = async (entryId: string) => {
    if (!plan) return
    try {
      await removeMealEntry(plan.id, entryId)
      setPlan((prev) => {
        if (!prev) return prev
        const entries = prev.entries.filter((e) => e.id !== entryId)
        const days: WeeklyPlan['days'] = {}
        for (const entry of entries) {
          if (!days[entry.date]) days[entry.date] = {}
          const mt = entry.mealType
          if (!days[entry.date][mt]) days[entry.date][mt] = []
          days[entry.date][mt]!.push(entry)
        }
        return { ...prev, entries, days }
      })
    } catch (err) {
      console.error('Failed to remove meal entry', err)
    }
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">{formatWeekRange(weekStartDate)}</span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSuggest}
            disabled={suggesting}
            className="gap-1.5"
          >
            {suggesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Suggest Weekly Plan
          </Button>
          {plan && plan.entries.length > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/grocery-list?planId=${plan.id}`}>
                <ShoppingCart className="h-4 w-4 mr-1" />
                Grocery List
              </Link>
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Suggest error */}
      {suggestError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {suggestError}
        </div>
      )}

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day headers — clicking selects the day for macro summary */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
            <div />
            {days.map((day) => {
              const dateStr = toISODate(day)
              const label = formatDayLabel(day, today)
              const isToday = dateStr === toISODate(today)
              const isSelected = dateStr === selectedDate
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`text-center text-sm font-medium py-2 rounded-md transition-colors w-full ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Meal rows */}
          {MEAL_TYPES.map((mealType) => (
            <div key={mealType} className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-2">
              <div className="flex items-start justify-end pr-2 pt-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {MEAL_LABELS[mealType]}
                </span>
              </div>
              {days.map((day) => {
                const dateStr = toISODate(day)
                const entries = plan?.days[dateStr]?.[mealType] ?? []
                const isSelected = dateStr === selectedDate
                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`rounded-md border p-1 min-h-[90px] cursor-pointer transition-colors ${
                      isSelected ? 'border-primary/40 bg-primary/5' : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <MealSlot
                      date={dateStr}
                      mealType={mealType}
                      entries={entries}
                      onAdd={handleAdd}
                      onRemove={handleRemove}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Daily macro progress for selected day */}
      <DayMacroSummary plan={plan} selectedDate={selectedDate} />

      {/* Garmin activity for selected day */}
      <ActivityWidget
        date={selectedDate}
        caloriesConsumed={
          plan ? computeDayNutrition(plan.entries, selectedDate).calories : undefined
        }
        calorieGoal={goals?.calories ?? undefined}
      />

      {/* Empty state */}
      {!plan && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground space-y-2">
          <p>No meal plan for this week.</p>
          <p className="text-xs">
            Click <strong>Suggest Weekly Plan</strong> to auto-fill based on your macro goals, or
            click <strong>+</strong> on any cell to add meals manually.
          </p>
        </div>
      )}

      {/* Add meal dialog */}
      {dialogState && (
        <AddMealDialog
          open={dialogState.open}
          onClose={() => setDialogState(null)}
          onAdd={handleAddConfirm}
          date={dialogState.date}
          mealType={dialogState.mealType}
          consumedOnDate={plan ? plan.entries.filter((e) => e.date === dialogState.date) : []}
        />
      )}
    </div>
  )
}
