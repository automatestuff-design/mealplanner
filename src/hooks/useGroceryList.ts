import { useQuery } from '@tanstack/react-query'
import { fetchGroceryList } from '@/lib/api/grocery-list'

export function useGroceryList(mealPlanId: string | undefined) {
  return useQuery({
    queryKey: ['grocery-list', mealPlanId],
    queryFn: () => fetchGroceryList(mealPlanId!),
    enabled: !!mealPlanId,
  })
}
