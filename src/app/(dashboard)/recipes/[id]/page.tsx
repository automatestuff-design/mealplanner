import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Clock, Users, Pencil, Trash2 } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NutritionBadge } from '@/components/recipes/NutritionBadge'
import { calculateRecipeNutrition } from '@/lib/utils/nutrition'
import { DeleteRecipeButton } from './DeleteRecipeButton'

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  const recipe = await prisma.recipe.findFirst({
    where: {
      id,
      OR: [{ authorId: session!.user!.id as string }, { isPublic: true }],
    },
    include: {
      author: { select: { id: true, name: true } },
      ingredients: {
        orderBy: { sortOrder: 'asc' },
        include: {
          ingredient: true,
        },
      },
    },
  })

  if (!recipe) notFound()

  const nutrition = calculateRecipeNutrition(recipe.ingredients, recipe.servings)
  const isAuthor = recipe.authorId === (session!.user!.id as string)
  const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)

  return (
    <div>
      <Header title={recipe.title} />
      <div className="p-6 max-w-3xl">
        {/* Header actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-wrap gap-1">
            {recipe.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          {isAuthor && (
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/recipes/${id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <DeleteRecipeButton recipeId={id} />
            </div>
          )}
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground mb-6">
          {recipe.prepTime && (
            <div>
              <span className="font-medium text-foreground">Prep</span> {recipe.prepTime} min
            </div>
          )}
          {recipe.cookTime && (
            <div>
              <span className="font-medium text-foreground">Cook</span> {recipe.cookTime} min
            </div>
          )}
          {totalTime > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {totalTime} min total
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
          </div>
        </div>

        {recipe.description && (
          <p className="text-muted-foreground mb-6">{recipe.description}</p>
        )}

        {/* Nutrition */}
        <div className="mb-6">
          <h2 className="font-semibold mb-2">Nutrition (per serving)</h2>
          <NutritionBadge nutrition={nutrition} />
        </div>

        {/* Ingredients */}
        <div className="mb-6">
          <h2 className="font-semibold mb-3">Ingredients</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ri) => (
              <li key={ri.id} className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground">•</span>
                <span>
                  <span className="font-medium">
                    {ri.quantity} {ri.unit}
                  </span>{' '}
                  <span className="capitalize">{ri.ingredient.name}</span>
                  {ri.notes && (
                    <span className="text-muted-foreground"> ({ri.notes})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        {recipe.instructions && (
          <div>
            <h2 className="font-semibold mb-3">Instructions</h2>
            <ol className="space-y-3 text-sm">
              {recipe.instructions
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((step, idx) => {
                  // Strip leading "1. " numbering if present — we render our own counter
                  const text = step.replace(/^\d+\.\s*/, '')
                  return (
                    <li key={idx} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-foreground leading-relaxed">{text}</span>
                    </li>
                  )
                })}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
