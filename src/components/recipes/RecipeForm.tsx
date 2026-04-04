'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { IngredientRow } from './IngredientRow'
import { createRecipe, updateRecipe } from '@/lib/api/recipes'
import type { RecipeDetail } from '@/types'
import type { RecipeIngredientInput } from '@/lib/validations/recipe'

interface RecipeFormProps {
  recipe?: RecipeDetail
}

type IngredientEntry = Partial<RecipeIngredientInput> & { _key: number }

export function RecipeForm({ recipe }: RecipeFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(recipe?.title ?? '')
  const [description, setDescription] = useState(recipe?.description ?? '')
  const [instructions, setInstructions] = useState(recipe?.instructions ?? '')
  const [prepTime, setPrepTime] = useState(recipe?.prepTime?.toString() ?? '')
  const [cookTime, setCookTime] = useState(recipe?.cookTime?.toString() ?? '')
  const [servings, setServings] = useState(recipe?.servings?.toString() ?? '1')
  const [tags, setTags] = useState(recipe?.tags?.join(', ') ?? '')
  const [isPublic, setIsPublic] = useState(recipe?.isPublic ?? false)
  const [ingredients, setIngredients] = useState<IngredientEntry[]>(
    recipe?.ingredients.map((ing, i) => ({
      _key: i,
      ingredientId: ing.ingredient.id,
      ingredientName: ing.ingredient.name,
      quantity: ing.quantity,
      unit: ing.unit,
      notes: ing.notes ?? undefined,
    })) ?? [{ _key: 0 }]
  )
  const [nextKey, setNextKey] = useState(ingredients.length)

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { _key: nextKey }])
    setNextKey((k) => k + 1)
  }

  const removeIngredient = (key: number) => {
    setIngredients((prev) => prev.filter((i) => i._key !== key))
  }

  const updateIngredient = (key: number, value: Omit<IngredientEntry, '_key'>) => {
    setIngredients((prev) => prev.map((i) => (i._key === key ? { ...i, ...value } : i)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validIngredients = ingredients.filter(
      (i) => i.ingredientName && i.quantity && i.unit
    ) as RecipeIngredientInput[]

    if (validIngredients.length === 0) {
      setError('Add at least one ingredient with name, quantity, and unit.')
      return
    }

    const data = {
      title,
      description: description || undefined,
      instructions,
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      servings: parseInt(servings) || 1,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      isPublic,
      ingredients: validIngredients,
    }

    setIsSubmitting(true)
    try {
      if (recipe) {
        await updateRecipe(recipe.id, data)
        router.push(`/recipes/${recipe.id}`)
      } else {
        const created = await createRecipe(data)
        router.push(`/recipes/${created.id}`)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Recipe name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the recipe"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prepTime">Prep time (min)</Label>
          <Input
            id="prepTime"
            type="number"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            min={0}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cookTime">Cook time (min)</Label>
          <Input
            id="cookTime"
            type="number"
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
            min={0}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="servings">Servings *</Label>
          <Input
            id="servings"
            type="number"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            min={1}
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ingredients *</Label>
          <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
            <Plus className="h-4 w-4" />
            Add ingredient
          </Button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ing, idx) => (
            <IngredientRow
              key={ing._key}
              index={idx}
              onRemove={() => removeIngredient(ing._key)}
              onChange={(val) => updateIngredient(ing._key, val)}
              defaultValue={
                ing.ingredientName
                  ? {
                      ingredientId: ing.ingredientId ?? '',
                      ingredientName: ing.ingredientName,
                      quantity: ing.quantity ?? 0,
                      unit: ing.unit ?? 'g',
                      notes: ing.notes,
                    }
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instructions *</Label>
        <Textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Step-by-step instructions..."
          rows={8}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="vegetarian, quick, meal-prep"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isPublic"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="isPublic">Make this recipe public</Label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : recipe ? 'Update Recipe' : 'Create Recipe'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
