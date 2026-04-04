'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteRecipe } from '@/lib/api/recipes'

export function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this recipe?')) return

    setIsDeleting(true)
    try {
      await deleteRecipe(recipeId)
      router.push('/recipes')
      router.refresh()
    } catch {
      alert('Failed to delete recipe')
      setIsDeleting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
      {isDeleting ? 'Deleting...' : 'Delete'}
    </Button>
  )
}
