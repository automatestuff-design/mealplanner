import { Header } from '@/components/layout/Header'
import { RecipeForm } from '@/components/recipes/RecipeForm'

export default function NewRecipePage() {
  return (
    <div>
      <Header title="New Recipe" />
      <div className="p-6">
        <RecipeForm />
      </div>
    </div>
  )
}
