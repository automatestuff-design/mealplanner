import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchRecipes, fetchRecipe, createRecipe, updateRecipe, deleteRecipe } from '@/lib/api/recipes'
import type { RecipeInput, UpdateRecipeInput } from '@/lib/validations/recipe'

export function useRecipes(params?: { search?: string; tags?: string[]; page?: number }) {
  return useQuery({
    queryKey: ['recipes', params],
    queryFn: () => fetchRecipes(params),
  })
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: ['recipes', id],
    queryFn: () => fetchRecipe(id),
    enabled: !!id,
  })
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: RecipeInput) => createRecipe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export function useUpdateRecipe(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateRecipeInput) => updateRecipe(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipes', id] })
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
