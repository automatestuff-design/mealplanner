import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyTerraSignature,
  normaliseDailyPayload,
  type TerraWebhookPayload,
} from '@/lib/integrations/terra'

/**
 * POST /api/integrations/terra/webhook
 *
 * Terra sends all wearable events here.  Configure this URL in the Terra
 * dashboard under Customise → Webhook URL.
 *
 * Handled event types:
 *   auth   — user connected; store terraUserId → userId mapping
 *   deauth — user disconnected; remove connection record
 *   daily  — daily summary; upsert DailyActivity row
 */
export async function POST(req: Request) {
  const rawBody = await req.text()

  // Verify the request came from Terra
  const signature = req.headers.get('terra-signature')
  const valid = await verifyTerraSignature(rawBody, signature)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: TerraWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, user } = payload

  // ── auth: user connected ────────────────────────────────────────────────────
  if (type === 'auth') {
    const { user_id: terraUserId, reference_id: userId } = user
    if (!userId) {
      console.warn('[terra/webhook] auth event missing reference_id')
      return NextResponse.json({ ok: true })
    }

    await prisma.activityConnection.upsert({
      where: { userId },
      create: { userId, terraUserId, provider: user.provider ?? 'GARMIN' },
      update: { terraUserId, provider: user.provider ?? 'GARMIN' },
    })
    console.log(`[terra/webhook] Connected Garmin for user ${userId}`)
    return NextResponse.json({ ok: true })
  }

  // ── deauth: user disconnected ───────────────────────────────────────────────
  if (type === 'deauth') {
    await prisma.activityConnection
      .delete({ where: { terraUserId: user.user_id } })
      .catch(() => {})
    return NextResponse.json({ ok: true })
  }

  // ── daily: daily summary data ───────────────────────────────────────────────
  if (type === 'daily' && Array.isArray(payload.data)) {
    // Look up which app user this Terra user maps to
    const connection = await prisma.activityConnection.findUnique({
      where: { terraUserId: user.user_id },
    })
    if (!connection) {
      console.warn(`[terra/webhook] No connection for terra_user_id ${user.user_id}`)
      return NextResponse.json({ ok: true })
    }

    for (const dailyData of payload.data) {
      const fields = normaliseDailyPayload(dailyData)
      await prisma.dailyActivity.upsert({
        where: { userId_date: { userId: connection.userId, date: fields.date } },
        create: { userId: connection.userId, ...fields },
        update: {
          steps: fields.steps,
          activeKcal: fields.activeKcal,
          bmrKcal: fields.bmrKcal,
          totalKcal: fields.totalKcal,
          heartRateAvg: fields.heartRateAvg,
          heartRateResting: fields.heartRateResting,
          activeMinutes: fields.activeMinutes,
          stressAvg: fields.stressAvg,
        },
      })
    }

    return NextResponse.json({ ok: true })
  }

  // All other event types (sleep, activity, body) — acknowledge but ignore
  return NextResponse.json({ ok: true })
}
