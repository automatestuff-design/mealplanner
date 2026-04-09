import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/activity?date=YYYY-MM-DD
 * Returns the DailyActivity record for the given date (defaults to today UTC).
 * Also returns whether the user has a Garmin connection configured.
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  const date = dateParam ? new Date(`${dateParam}T00:00:00Z`) : (() => {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    return d
  })()

  const [activity, connection] = await Promise.all([
    prisma.dailyActivity.findUnique({
      where: { userId_date: { userId: session.user.id, date } },
    }),
    prisma.activityConnection.findUnique({
      where: { userId: session.user.id },
      select: { provider: true, connectedAt: true },
    }),
  ])

  return NextResponse.json({ activity, connection })
}
