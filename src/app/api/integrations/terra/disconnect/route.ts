import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deauthTerraUser } from '@/lib/integrations/terra'

/**
 * DELETE /api/integrations/terra/disconnect
 * Revokes the Garmin link on Terra's side and removes the local connection record.
 */
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connection = await prisma.activityConnection.findUnique({
    where: { userId: session.user.id },
  })

  if (!connection) {
    return NextResponse.json({ error: 'No Garmin connection found' }, { status: 404 })
  }

  try {
    await deauthTerraUser(connection.terraUserId)
  } catch {
    // Log but don't fail — still remove local record
    console.warn('[terra/disconnect] Terra deauth failed; removing local record anyway')
  }

  await prisma.activityConnection.delete({ where: { userId: session.user.id } })

  return NextResponse.json({ ok: true })
}
