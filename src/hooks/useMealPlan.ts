import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMealPlan, createMealPlan, addMealEntry, removeMealEntry } from '@/lib/api/meal-plans'
import type { CreateMealPlanInput, MealEntryInput } from '@/lib/validations/meal-plan'

export function useMealPlan(weekStart: string) {
  return useQuery({
    queryKey: ['meal-plan', weekStart],
    queryFn: () => fetchMealPlan(weekStart),
    retry: false,
  })
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMealPlanInput) => createMealPlan(data),
    onSuccess: (plan) => {
      queryClient.setQueryData(['meal-plan', plan.weekStart], plan)
    },
  })
}

export function useAddMealEntry(planId: string, weekStart: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MealEntryInput) => addMealEntry(planId, data),
    onSuccess: (plan) => {
      queryClient.setQueryData(['meal-plan', weekStart], plan)
    },
  })
}

export function useRemoveMealEntry(planId: string, weekStart: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entryId: string) => removeMealEntry(planId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', weekStart] })
    },
  })
}
