import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addMealEntrySchema } from '@/lib/validations/meal-plan'
import { fromISODate } from '@/lib/utils/date'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const plan = await prisma.mealPlan.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!plan) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const parsed = addMealEntrySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const entry = await prisma.mealEntry.create({
      data: {
        date: fromISODate(parsed.data.date),
        mealType: parsed.data.mealType,
        servings: parsed.data.servings,
        notes: parsed.data.notes,
        mealPlanId: id,
        recipeId: parsed.data.recipeId,
      },
      select: {
        id: true,
        date: true,
        mealType: true,
        servings: true,
        notes: true,
        recipe: {
          select: {
            id: true,
            title: true,
            prepTime: true,
            cookTime: true,
            imageUrl: true,
          },
        },
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
