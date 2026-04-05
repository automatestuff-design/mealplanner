import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchGoals, saveGoals } from '@/lib/api/goals'
import type { UserGoalsInput } from '@/lib/validations/goals'

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
  })
}

export function useSaveGoals() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UserGoalsInput) => saveGoals(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['goals'], updated)
    },
  })
}
