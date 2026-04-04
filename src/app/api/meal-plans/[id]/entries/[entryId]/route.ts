import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, entryId } = await params

  const entry = await prisma.mealEntry.findFirst({
    where: {
      id: entryId,
      mealPlanId: id,
      mealPlan: { userId: session.user.id },
    },
  })

  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  await prisma.mealEntry.delete({ where: { id: entryId } })
  return new NextResponse(null, { status: 204 })
}
