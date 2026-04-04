import Link from 'next/link'
import Image from 'next/image'
import { Clock, Users } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NutritionBadge } from './NutritionBadge'
import type { RecipeDetail } from '@/types'

interface RecipeCardProps {
  recipe: Pick<
    RecipeDetail,
    'id' | 'title' | 'description' | 'prepTime' | 'cookTime' | 'servings' | 'imageUrl' | 'tags' | 'nutrition'
  >
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        {recipe.imageUrl ? (
          <div className="relative h-48 w-full">
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center bg-muted">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        <CardContent className="p-4">
          <h3 className="font-semibold text-base leading-tight mb-1 line-clamp-2">
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{recipe.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            {totalTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {totalTime} min
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
            </span>
          </div>
          <NutritionBadge nutrition={recipe.nutrition} compact />
        </CardContent>
        {recipe.tags.length > 0 && (
          <CardFooter className="px-4 pb-4 pt-0 flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </CardFooter>
        )}
      </Card>
    </Link>
  )
}
