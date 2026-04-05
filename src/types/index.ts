// ─── User Goals ───────────────────────────────────────────────────────────────

export type UserGoals = {
  id?: string
  calories: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  fiberG: number | null
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export type NutritionSummary = {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
  perServing: boolean
}

// ─── Ingredients ──────────────────────────────────────────────────────────────

export type IngredientSummary = {
  id: string
  name: string
  category: string | null
  calories: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  fiberG: number | null
  sodiumMg: number | null
}

export type RecipeIngredientWithDetail = {
  id: string
  quantity: number
  unit: string
  notes: string | null
  sortOrder: number
  ingredient: IngredientSummary
}

// ─── Recipes ──────────────────────────────────────────────────────────────────

export type RecipeDetail = {
  id: string
  title: string
  description: string | null
  instructions: string
  prepTime: number | null
  cookTime: number | null
  servings: number
  imageUrl: string | null
  tags: string[]
  isPublic: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string | null
    image: string | null
  }
  ingredients: RecipeIngredientWithDetail[]
  nutrition: NutritionSummary
}

export type RecipeSummary = Pick<
  RecipeDetail,
  | 'id'
  | 'title'
  | 'description'
  | 'prepTime'
  | 'cookTime'
  | 'servings'
  | 'imageUrl'
  | 'tags'
  | 'isPublic'
  | 'nutrition'
>

// ─── Meal Planning ────────────────────────────────────────────────────────────

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'

export type MealEntryWithRecipe = {
  id: string
  date: string // ISO date "YYYY-MM-DD"
  mealType: MealType
  servings: number
  notes: string | null
  recipe: {
    id: string
    title: string
    prepTime: number | null
    cookTime: number | null
    imageUrl: string | null
    servings: number
    nutrition: NutritionSummary
  }
}

export type WeeklyPlan = {
  id: string
  weekStart: string
  name: string | null
  // Grouped by ISO date -> by MealType -> entries[]
  days: Record<string, Partial<Record<MealType, MealEntryWithRecipe[]>>>
  entries: MealEntryWithRecipe[]
}

// ─── Grocery List ─────────────────────────────────────────────────────────────

export type GroceryItem = {
  ingredientId: string
  name: string
  category: string | null
  quantities: Array<{ amount: number; unit: string }>
  checked: boolean
}

export type GroceryList = {
  mealPlanId: string
  weekStart: string
  sections: Array<{
    category: string
    items: GroceryItem[]
  }>
}
