import Link from 'next/link'
import { Plus } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { RecipeCard } from '@/components/recipes/RecipeCard'
import { calculateRecipeNutrition } from '@/lib/utils/nutrition'
import { ImportButton } from './ImportButton'

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tags?: string }>
}) {
  const session = await auth()
  const params = await searchParams
  const search = params.search ?? ''
  const tags = params.tags ? params.tags.split(',').filter(Boolean) : []

  const recipes = await prisma.recipe.findMany({
    where: {
      OR: [{ authorId: session!.user!.id as string }, { isPublic: true }],
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(tags.length && { tags: { hasSome: tags } }),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      ingredients: {
        select: {
          quantity: true,
          unit: true,
          ingredient: {
            select: {
              calories: true,
              proteinG: true,
              carbsG: true,
              fatG: true,
              fiberG: true,
            },
          },
        },
      },
    },
  })

  const recipesWithNutrition = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    servings: r.servings,
    imageUrl: r.imageUrl,
    tags: r.tags,
    isPublic: r.isPublic,
    nutrition: calculateRecipeNutrition(
      r.ingredients.map((ri) => ({
        id: '',
        quantity: ri.quantity,
        unit: ri.unit,
        notes: null,
        sortOrder: 0,
        ingredient: {
          id: '',
          name: '',
          category: null,
          sodiumMg: null,
          calories: ri.ingredient.calories,
          proteinG: ri.ingredient.proteinG,
          carbsG: ri.ingredient.carbsG,
          fatG: ri.ingredient.fatG,
          fiberG: ri.ingredient.fiberG,
        },
      })),
      r.servings
    ),
  }))

  return (
    <div>
      <Header title="Recipes" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <ImportButton />
            <Button asChild>
              <Link href="/recipes/new">
                <Plus className="h-4 w-4" />
                New Recipe
              </Link>
            </Button>
          </div>
        </div>

        {recipesWithNutrition.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground mb-4">No recipes yet. Create your first one!</p>
            <Button asChild>
              <Link href="/recipes/new">
                <Plus className="h-4 w-4" />
                Create Recipe
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recipesWithNutrition.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
