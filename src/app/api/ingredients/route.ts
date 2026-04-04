import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const limit = Math.min(20, parseInt(searchParams.get('limit') ?? '10'))

  const ingredients = await prisma.ingredient.findMany({
    where: search
      ? { name: { contains: search.toLowerCase().trim(), mode: 'insensitive' } }
      : undefined,
    take: limit,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      category: true,
      calories: true,
      proteinG: true,
      carbsG: true,
      fatG: true,
      fiberG: true,
      sodiumMg: true,
    },
  })

  return NextResponse.json(ingredients)
}
