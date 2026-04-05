'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useGoals, useSaveGoals } from '@/hooks/useGoals'

const PRESETS = [
  { label: 'Weight Loss', calories: 1800, proteinG: 150, carbsG: 150, fatG: 60, fiberG: 30 },
  { label: 'Maintenance', calories: 2200, proteinG: 130, carbsG: 220, fatG: 80, fiberG: 30 },
  { label: 'Muscle Gain', calories: 2800, proteinG: 200, carbsG: 300, fatG: 80, fiberG: 35 },
  { label: 'Low Carb', calories: 2000, proteinG: 160, carbsG: 80, fatG: 130, fiberG: 25 },
]

export function MacroGoalsForm() {
  const { data: goals, isLoading } = useGoals()
  const { mutate: save, isPending, isSuccess } = useSaveGoals()

  const [calories, setCalories] = useState('')
  const [proteinG, setProteinG] = useState('')
  const [carbsG, setCarbsG] = useState('')
  const [fatG, setFatG] = useState('')
  const [fiberG, setFiberG] = useState('')

  useEffect(() => {
    if (goals) {
      setCalories(goals.calories?.toString() ?? '')
      setProteinG(goals.proteinG?.toString() ?? '')
      setCarbsG(goals.carbsG?.toString() ?? '')
      setFatG(goals.fatG?.toString() ?? '')
      setFiberG(goals.fiberG?.toString() ?? '')
    }
  }, [goals])

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setCalories(preset.calories.toString())
    setProteinG(preset.proteinG.toString())
    setCarbsG(preset.carbsG.toString())
    setFatG(preset.fatG.toString())
    setFiberG(preset.fiberG.toString())
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    save({
      calories: calories ? parseInt(calories) : null,
      proteinG: proteinG ? parseInt(proteinG) : null,
      carbsG: carbsG ? parseInt(carbsG) : null,
      fatG: fatG ? parseInt(fatG) : null,
      fiberG: fiberG ? parseInt(fiberG) : null,
    })
  }

  // Compute estimated calories from macros as a sanity check
  const estimatedCalories =
    (parseInt(proteinG) || 0) * 4 +
    (parseInt(carbsG) || 0) * 4 +
    (parseInt(fatG) || 0) * 9

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6 max-w-xl">
      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Presets</CardTitle>
          <CardDescription>Start from a common goal and adjust from there</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              type="button"
              className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <div>{preset.label}</div>
              <div className="text-xs text-muted-foreground">{preset.calories} kcal</div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="calories">Daily Calorie Target (kcal)</Label>
            <Input
              id="calories"
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="e.g. 2000"
              min={0}
            />
            {estimatedCalories > 0 && (
              <p className="text-xs text-muted-foreground">
                Estimated from macros below: {estimatedCalories} kcal
                {Math.abs(estimatedCalories - (parseInt(calories) || 0)) > 100 &&
                  calories && (
                    <span className="text-amber-600 ml-1">
                      (differs from target by{' '}
                      {Math.abs(estimatedCalories - parseInt(calories))} kcal)
                    </span>
                  )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="protein">Protein (g/day)</Label>
            <Input
              id="protein"
              type="number"
              value={proteinG}
              onChange={(e) => setProteinG(e.target.value)}
              placeholder="e.g. 150"
              min={0}
            />
            {proteinG && (
              <p className="text-xs text-muted-foreground">
                {(parseInt(proteinG) || 0) * 4} kcal
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="carbs">Carbohydrates (g/day)</Label>
            <Input
              id="carbs"
              type="number"
              value={carbsG}
              onChange={(e) => setCarbsG(e.target.value)}
              placeholder="e.g. 200"
              min={0}
            />
            {carbsG && (
              <p className="text-xs text-muted-foreground">
                {(parseInt(carbsG) || 0) * 4} kcal
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fat">Fat (g/day)</Label>
            <Input
              id="fat"
              type="number"
              value={fatG}
              onChange={(e) => setFatG(e.target.value)}
              placeholder="e.g. 70"
              min={0}
            />
            {fatG && (
              <p className="text-xs text-muted-foreground">
                {(parseInt(fatG) || 0) * 9} kcal
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiber">Fiber (g/day)</Label>
            <Input
              id="fiber"
              type="number"
              value={fiberG}
              onChange={(e) => setFiberG(e.target.value)}
              placeholder="e.g. 30"
              min={0}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Goals'}
          </Button>
          {isSuccess && (
            <span className="text-sm text-green-600">Goals saved!</span>
          )}
        </div>
      </form>
    </div>
  )
}
