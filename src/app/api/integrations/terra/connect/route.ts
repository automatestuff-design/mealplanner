import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateTerraAuthUrl, isTerraConfigured } from '@/lib/integrations/terra'

/**
 * GET /api/integrations/terra/connect
 * Generates a Terra widget URL and redirects the user to it.
 * After the user authorises Garmin, Terra calls our webhook and then
 * redirects back to /settings/integrations?connected=1
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isTerraConfigured()) {
    return NextResponse.json(
      { error: 'Terra API is not configured on this server.' },
      { status: 503 }
    )
  }

  try {
    const { auth_url } = await generateTerraAuthUrl(session.user.id)
    return NextResponse.redirect(auth_url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to connect'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
