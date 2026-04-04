import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 12)
  const user = await prisma.user.upsert({
    where: { email: 'demo@mealplanner.app' },
    update: {},
    create: {
      email: 'demo@mealplanner.app',
      name: 'Demo User',
      passwordHash,
    },
  })

  console.log('Created user:', user.email)

  // Create ingredients
  const ingredients = await Promise.all([
    prisma.ingredient.upsert({
      where: { name: 'chicken breast' },
      update: {},
      create: {
        name: 'chicken breast',
        category: 'meat',
        calories: 165,
        proteinG: 31,
        carbsG: 0,
        fatG: 3.6,
        fiberG: 0,
        sodiumMg: 74,
      },
    }),
    prisma.ingredient.upsert({
      where: { name: 'brown rice' },
      update: {},
      create: {
        name: 'brown rice',
        category: 'grains',
        calories: 216,
        proteinG: 5,
        carbsG: 45,
        fatG: 1.8,
        fiberG: 3.5,
        sodiumMg: 10,
      },
    }),
    prisma.ingredient.upsert({
      where: { name: 'broccoli' },
      update: {},
      create: {
        name: 'broccoli',
        category: 'produce',
        calories: 34,
        proteinG: 2.8,
        carbsG: 7,
        fatG: 0.4,
        fiberG: 2.6,
        sodiumMg: 33,
      },
    }),
    prisma.ingredient.upsert({
      where: { name: 'olive oil' },
      update: {},
      create: {
        name: 'olive oil',
        category: 'pantry',
        calories: 884,
        proteinG: 0,
        carbsG: 0,
        fatG: 100,
        fiberG: 0,
        sodiumMg: 2,
      },
    }),
    prisma.ingredient.upsert({
      where: { name: 'garlic' },
      update: {},
      create: {
        name: 'garlic',
        category: 'produce',
        calories: 149,
        proteinG: 6.4,
        carbsG: 33,
        fatG: 0.5,
        fiberG: 2.1,
        sodiumMg: 17,
      },
    }),
    prisma.ingredient.upsert({
      where: { name: 'eggs' },
      update: {},
      create: {
        name: 'eggs',
        category: 'dairy',
        calories: 155,
        proteinG: 13,
        carbsG: 1.1,
        fatG: 11,
        fiberG: 0,
        sodiumMg: 124,
      },
    }),
    prisma.ingredient.upsert({
      where: { name: 'oats' },
      update: {},
      create: {
        name: 'oats',
        category: 'grains',
        calories: 389,
        proteinG: 17,
        carbsG: 66,
        fatG: 7,
        fiberG: 11,
        sodiumMg: 2,
      },
    }),
    prisma.ingredient.upsert({
      where: { name: 'banana' },
      update: {},
      create: {
        name: 'banana',
        category: 'produce',
        calories: 89,
        proteinG: 1.1,
        carbsG: 23,
        fatG: 0.3,
        fiberG: 2.6,
        sodiumMg: 1,
      },
    }),
    prisma.ingredient.upsert({
      where: { name: 'milk' },
      update: {},
      create: {
        name: 'milk',
        category: 'dairy',
        calories: 42,
        proteinG: 3.4,
        carbsG: 5,
        fatG: 1,
        fiberG: 0,
        sodiumMg: 44,
      },
    }),
    prisma.ingredient.upsert({
      where: { name: 'salmon fillet' },
      update: {},
      create: {
        name: 'salmon fillet',
        category: 'seafood',
        calories: 208,
        proteinG: 20,
        carbsG: 0,
        fatG: 13,
        fiberG: 0,
        sodiumMg: 59,
      },
    }),
    prisma.ingredient.upsert({
      where: { name: 'lemon' },
      update: {},
      create: {
        name: 'lemon',
        category: 'produce',
        calories: 29,
        proteinG: 1.1,
        carbsG: 9,
        fatG: 0.3,
        fiberG: 2.8,
        sodiumMg: 2,
      },
    }),
    prisma.ingredient.upsert({
      where: { name: 'spinach' },
      update: {},
      create: {
        name: 'spinach',
        category: 'produce',
        calories: 23,
        proteinG: 2.9,
        carbsG: 3.6,
        fatG: 0.4,
        fiberG: 2.2,
        sodiumMg: 79,
      },
    }),
  ])

  const ingredientMap = Object.fromEntries(ingredients.map((i) => [i.name, i]))
  console.log('Created', ingredients.length, 'ingredients')

  // Create recipes
  const recipe1 = await prisma.recipe.create({
    data: {
      title: 'Grilled Chicken with Brown Rice',
      description:
        'A simple, protein-packed meal perfect for meal prep. Tender grilled chicken served with fluffy brown rice and steamed broccoli.',
      instructions: `1. Season chicken breast with salt, pepper, and garlic powder.
2. Heat olive oil in a grill pan over medium-high heat.
3. Grill chicken for 6-7 minutes per side until internal temperature reaches 165°F.
4. Meanwhile, cook brown rice according to package instructions.
5. Steam broccoli for 4-5 minutes until tender-crisp.
6. Serve chicken sliced over rice with broccoli on the side.`,
      prepTime: 10,
      cookTime: 25,
      servings: 2,
      tags: ['high-protein', 'meal-prep', 'gluten-free'],
      isPublic: true,
      authorId: user.id,
      ingredients: {
        create: [
          {
            quantity: 300,
            unit: 'g',
            sortOrder: 0,
            ingredientId: ingredientMap['chicken breast'].id,
          },
          {
            quantity: 180,
            unit: 'g',
            sortOrder: 1,
            ingredientId: ingredientMap['brown rice'].id,
          },
          {
            quantity: 200,
            unit: 'g',
            sortOrder: 2,
            ingredientId: ingredientMap['broccoli'].id,
          },
          {
            quantity: 15,
            unit: 'ml',
            sortOrder: 3,
            ingredientId: ingredientMap['olive oil'].id,
          },
          {
            quantity: 10,
            unit: 'g',
            notes: 'minced',
            sortOrder: 4,
            ingredientId: ingredientMap['garlic'].id,
          },
        ],
      },
    },
  })

  const recipe2 = await prisma.recipe.create({
    data: {
      title: 'Overnight Oats',
      description:
        'Creamy, no-cook oats prepared the night before for a quick and nutritious breakfast. Customize with your favorite toppings.',
      instructions: `1. Combine oats, milk, and a pinch of salt in a jar or container.
2. Stir well and seal the container.
3. Refrigerate overnight (at least 6 hours).
4. In the morning, stir oats and add banana slices on top.
5. Add optional toppings: honey, nuts, berries, or nut butter.`,
      prepTime: 5,
      cookTime: 0,
      servings: 1,
      tags: ['breakfast', 'no-cook', 'vegetarian', 'meal-prep'],
      isPublic: true,
      authorId: user.id,
      ingredients: {
        create: [
          {
            quantity: 80,
            unit: 'g',
            sortOrder: 0,
            ingredientId: ingredientMap['oats'].id,
          },
          {
            quantity: 200,
            unit: 'ml',
            sortOrder: 1,
            ingredientId: ingredientMap['milk'].id,
          },
          {
            quantity: 1,
            unit: 'whole',
            sortOrder: 2,
            ingredientId: ingredientMap['banana'].id,
          },
        ],
      },
    },
  })

  const recipe3 = await prisma.recipe.create({
    data: {
      title: 'Baked Lemon Salmon',
      description:
        'Flaky, flavorful salmon baked with lemon and garlic. Ready in under 20 minutes and pairs well with any side.',
      instructions: `1. Preheat oven to 400°F (200°C).
2. Place salmon fillets on a lined baking sheet.
3. Drizzle with olive oil and squeeze lemon juice over each fillet.
4. Add minced garlic on top and season with salt and pepper.
5. Bake for 12-15 minutes until salmon flakes easily with a fork.
6. Serve with lemon wedges and fresh spinach salad.`,
      prepTime: 5,
      cookTime: 15,
      servings: 2,
      tags: ['seafood', 'quick', 'gluten-free', 'high-protein'],
      isPublic: true,
      authorId: user.id,
      ingredients: {
        create: [
          {
            quantity: 400,
            unit: 'g',
            sortOrder: 0,
            ingredientId: ingredientMap['salmon fillet'].id,
          },
          {
            quantity: 1,
            unit: 'whole',
            sortOrder: 1,
            ingredientId: ingredientMap['lemon'].id,
          },
          {
            quantity: 15,
            unit: 'ml',
            sortOrder: 2,
            ingredientId: ingredientMap['olive oil'].id,
          },
          {
            quantity: 5,
            unit: 'g',
            notes: 'minced',
            sortOrder: 3,
            ingredientId: ingredientMap['garlic'].id,
          },
          {
            quantity: 100,
            unit: 'g',
            notes: 'for salad',
            sortOrder: 4,
            ingredientId: ingredientMap['spinach'].id,
          },
        ],
      },
    },
  })

  const recipe4 = await prisma.recipe.create({
    data: {
      title: 'Scrambled Eggs with Spinach',
      description:
        'Quick and nutritious scrambled eggs loaded with wilted spinach. A perfect protein-rich breakfast ready in minutes.',
      instructions: `1. Crack eggs into a bowl, season with salt and pepper, whisk well.
2. Heat olive oil in a non-stick pan over medium-low heat.
3. Add spinach and cook for 1-2 minutes until wilted.
4. Pour in egg mixture and gently fold with a spatula.
5. Cook slowly, stirring occasionally, until eggs are just set.
6. Remove from heat while slightly underdone — residual heat will finish cooking.`,
      prepTime: 5,
      cookTime: 8,
      servings: 1,
      tags: ['breakfast', 'quick', 'vegetarian', 'high-protein', 'gluten-free'],
      isPublic: true,
      authorId: user.id,
      ingredients: {
        create: [
          {
            quantity: 3,
            unit: 'whole',
            sortOrder: 0,
            ingredientId: ingredientMap['eggs'].id,
          },
          {
            quantity: 60,
            unit: 'g',
            sortOrder: 1,
            ingredientId: ingredientMap['spinach'].id,
          },
          {
            quantity: 10,
            unit: 'ml',
            sortOrder: 2,
            ingredientId: ingredientMap['olive oil'].id,
          },
        ],
      },
    },
  })

  console.log('Created recipes:', recipe1.title, recipe2.title, recipe3.title, recipe4.title)

  // Create a sample meal plan for the current week
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() + daysToMonday)
  weekStart.setHours(0, 0, 0, 0)

  const mealPlan = await prisma.mealPlan.create({
    data: {
      name: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
      weekStart,
      userId: user.id,
      entries: {
        create: [
          // Monday
          {
            date: weekStart,
            mealType: 'BREAKFAST',
            recipeId: recipe2.id,
            servings: 1,
          },
          {
            date: weekStart,
            mealType: 'DINNER',
            recipeId: recipe1.id,
            servings: 1,
          },
          // Tuesday
          {
            date: new Date(new Date(weekStart).setDate(weekStart.getDate() + 1)),
            mealType: 'BREAKFAST',
            recipeId: recipe4.id,
            servings: 1,
          },
          {
            date: new Date(new Date(weekStart).setDate(weekStart.getDate() + 1)),
            mealType: 'DINNER',
            recipeId: recipe3.id,
            servings: 1,
          },
          // Wednesday
          {
            date: new Date(new Date(weekStart).setDate(weekStart.getDate() + 2)),
            mealType: 'BREAKFAST',
            recipeId: recipe2.id,
            servings: 1,
          },
        ],
      },
    },
  })

  console.log('Created meal plan:', mealPlan.name)
  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
