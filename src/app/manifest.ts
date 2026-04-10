import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MealPlanner',
    short_name: 'MealPlanner',
    description: 'Plan your meals, manage recipes, and generate grocery lists',
    start_url: '/planner',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#16a34a',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    categories: ['food', 'health', 'lifestyle'],
    shortcuts: [
      {
        name: 'Meal Planner',
        url: '/planner',
        description: 'View and edit your weekly meal plan',
      },
      {
        name: 'Recipes',
        url: '/recipes',
        description: 'Browse your saved recipes',
      },
      {
        name: 'Grocery List',
        url: '/grocery-list',
        description: 'View your grocery list',
      },
    ],
  }
}
