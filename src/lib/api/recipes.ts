import type { RecipeDetail } from '@/types'
import type { RecipeInput, UpdateRecipeInput } from '@/lib/validations/recipe'

export async function fetchRecipes(params?: {
  search?: string
  tags?: string[]
  page?: number
  limit?: number
}): Promise<{ recipes: RecipeDetail[]; total: number }> {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.tags?.length) query.set('tags', params.tags.join(','))
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))

  const res = await fetch(`/api/recipes?${query}`)
  if (!res.ok) throw new Error('Failed to fetch recipes')
  return res.json()
}

export async function fetchRecipe(id: string): Promise<RecipeDetail> {
  const res = await fetch(`/api/recipes/${id}`)
  if (!res.ok) throw new Error('Failed to fetch recipe')
  return res.json()
}

export async function createRecipe(data: RecipeInput): Promise<RecipeDetail> {
  const res = await fetch('/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Failed to create recipe')
  }
  return res.json()
}

export async function updateRecipe(id: string, data: UpdateRecipeInput): Promise<RecipeDetail> {
  const res = await fetch(`/api/recipes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Failed to update recipe')
  }
  return res.json()
}

export async function deleteRecipe(id: string): Promise<void> {
  const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete recipe')
}
