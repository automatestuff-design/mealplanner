import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userGoalsSchema } from '@/lib/validations/goals'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const goals = await prisma.userGoals.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json(goals ?? {})
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = userGoalsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const goals = await prisma.userGoals.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...parsed.data },
      update: parsed.data,
    })

    return NextResponse.json(goals)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
