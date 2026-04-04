import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/Header'
import { RecipeForm } from '@/components/recipes/RecipeForm'
import { calculateRecipeNutrition } from '@/lib/utils/nutrition'
import type { RecipeDetail } from '@/types'

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  const recipe = await prisma.recipe.findFirst({
    where: { id, authorId: session!.user!.id as string },
    include: {
      author: { select: { id: true, name: true, image: true } },
      ingredients: {
        orderBy: { sortOrder: 'asc' },
        include: { ingredient: true },
      },
    },
  })

  if (!recipe) notFound()

  const recipeDetail: RecipeDetail = {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    instructions: recipe.instructions,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    imageUrl: recipe.imageUrl,
    tags: recipe.tags,
    isPublic: recipe.isPublic,
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
    author: recipe.author,
    ingredients: recipe.ingredients.map((ri) => ({
      id: ri.id,
      quantity: ri.quantity,
      unit: ri.unit,
      notes: ri.notes,
      sortOrder: ri.sortOrder,
      ingredient: {
        id: ri.ingredient.id,
        name: ri.ingredient.name,
        category: ri.ingredient.category,
        calories: ri.ingredient.calories,
        proteinG: ri.ingredient.proteinG,
        carbsG: ri.ingredient.carbsG,
        fatG: ri.ingredient.fatG,
        fiberG: ri.ingredient.fiberG,
        sodiumMg: ri.ingredient.sodiumMg,
      },
    })),
    nutrition: calculateRecipeNutrition(
      recipe.ingredients.map((ri) => ({
        id: ri.id,
        quantity: ri.quantity,
        unit: ri.unit,
        notes: ri.notes,
        sortOrder: ri.sortOrder,
        ingredient: {
          id: ri.ingredient.id,
          name: ri.ingredient.name,
          category: ri.ingredient.category,
          calories: ri.ingredient.calories,
          proteinG: ri.ingredient.proteinG,
          carbsG: ri.ingredient.carbsG,
          fatG: ri.ingredient.fatG,
          fiberG: ri.ingredient.fiberG,
          sodiumMg: ri.ingredient.sodiumMg,
        },
      })),
      recipe.servings
    ),
  }

  return (
    <div>
      <Header title="Edit Recipe" />
      <div className="p-6">
        <RecipeForm recipe={recipeDetail} />
      </div>
    </div>
  )
}
