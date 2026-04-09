/**
 * Terra API client — wearable data middleware that proxies Garmin (and other
 * devices) without requiring direct Garmin Health API approval.
 *
 * Sign up:  https://dashboard.tryterra.co  (free dev tier)
 * Docs:     https://docs.tryterra.co
 *
 * SERVER-SIDE ONLY — API key must never reach the browser.
 */

const TERRA_BASE = 'https://api.tryterra.co/v2'

function terraHeaders() {
  return {
    'x-api-key': process.env.TERRA_API_KEY ?? '',
    'dev-id': process.env.TERRA_DEV_ID ?? '',
    'Content-Type': 'application/json',
  }
}

export function isTerraConfigured(): boolean {
  return Boolean(process.env.TERRA_API_KEY && process.env.TERRA_DEV_ID)
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Generate a Terra widget session URL.  Redirect the user to `auth_url` — they
 * will choose Garmin (or another provider) and complete OAuth there.
 * Terra then sends an "auth" webhook to your callback with the terra_user_id.
 *
 * @param referenceId  Your internal user ID (returned back in webhooks)
 */
export async function generateTerraAuthUrl(referenceId: string): Promise<{
  auth_url: string
  session_id: string
}> {
  const params = new URLSearchParams({
    resource: 'GARMIN',
    reference_id: referenceId,
    auth_success_redirect_url: `${process.env.AUTH_URL}/settings/integrations?connected=1`,
    auth_failure_redirect_url: `${process.env.AUTH_URL}/settings/integrations?error=1`,
  })

  const res = await fetch(`${TERRA_BASE}/auth/authenticateUser?${params}`, {
    headers: terraHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Terra auth error ${res.status}: ${body}`)
  }

  return res.json()
}

/**
 * Deauthenticate (disconnect) a Terra user — revokes the Garmin link on Terra's side.
 */
export async function deauthTerraUser(terraUserId: string): Promise<void> {
  const res = await fetch(`${TERRA_BASE}/auth/deauthenticateUser?user_id=${terraUserId}`, {
    method: 'DELETE',
    headers: terraHeaders(),
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`Terra deauth error ${res.status}`)
  }
}

// ─── Webhook payload types ────────────────────────────────────────────────────

export interface TerraUser {
  user_id: string       // Terra's ID
  reference_id: string  // Your user ID
  provider: string
}

interface TerraCaloriesData {
  total_burned_calories?: number
  active_burned_calories?: number
  BMR_calories?: number
  net_intake_calories?: number
}

interface TerraDistanceData {
  steps?: number
  distance_meters?: number
}

interface TerraHeartRateSummary {
  avg_hr_bpm?: number
  resting_hr_bpm?: number
  min_hr_bpm?: number
  max_hr_bpm?: number
}

interface TerraActiveDurations {
  activity_seconds?: number
  moderate_intensity_seconds?: number
  vigorous_intensity_seconds?: number
}

interface TerraStressData {
  avg_stress_level?: number
  max_stress_level?: number
}

export interface TerraDailyData {
  metadata?: { start_time?: string; end_time?: string }
  calories_data?: TerraCaloriesData
  distance_data?: TerraDistanceData
  heart_rate_data?: { summary?: TerraHeartRateSummary }
  active_durations_data?: TerraActiveDurations
  stress_data?: TerraStressData
}

export interface TerraWebhookPayload {
  type: 'auth' | 'deauth' | 'daily' | 'activity' | 'sleep' | 'body' | string
  user: TerraUser
  data?: TerraDailyData[]
  old_user?: TerraUser
}

// ─── Webhook signature verification ──────────────────────────────────────────

/**
 * Verify that an incoming webhook actually came from Terra.
 * Terra sends the raw body HMAC-SHA256 signature in the `terra-signature` header.
 *
 * Returns true if the signature matches or if TERRA_WEBHOOK_SECRET is not set
 * (development mode — disable this shortcut before going to production).
 */
export async function verifyTerraSignature(
  rawBody: string,
  signature: string | null
): Promise<boolean> {
  const secret = process.env.TERRA_WEBHOOK_SECRET
  if (!secret) return true // dev shortcut

  if (!signature) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const expected = Buffer.from(sig).toString('hex')
  return expected === signature
}

// ─── Daily data normaliser ────────────────────────────────────────────────────

/**
 * Extract the fields we care about from a Terra daily payload and return them
 * in a shape ready to upsert into DailyActivity.
 */
export function normaliseDailyPayload(data: TerraDailyData): {
  date: Date
  steps: number | null
  activeKcal: number | null
  bmrKcal: number | null
  totalKcal: number | null
  heartRateAvg: number | null
  heartRateResting: number | null
  activeMinutes: number | null
  stressAvg: number | null
} {
  const startTime = data.metadata?.start_time
  const date = startTime ? new Date(startTime) : new Date()
  // Truncate to midnight UTC so it matches the DATE column
  date.setUTCHours(0, 0, 0, 0)

  const cal = data.calories_data ?? {}
  const activeKcal = round(cal.active_burned_calories)
  const bmrKcal = round(cal.BMR_calories)
  const totalKcal =
    activeKcal != null && bmrKcal != null
      ? activeKcal + bmrKcal
      : round(cal.total_burned_calories)

  const dur = data.active_durations_data ?? {}
  const moderateSec = dur.moderate_intensity_seconds ?? 0
  const vigorousSec = dur.vigorous_intensity_seconds ?? 0
  const activeMinutes = moderateSec + vigorousSec > 0
    ? Math.round((moderateSec + vigorousSec) / 60)
    : null

  return {
    date,
    steps: round(data.distance_data?.steps),
    activeKcal,
    bmrKcal,
    totalKcal,
    heartRateAvg: round(data.heart_rate_data?.summary?.avg_hr_bpm),
    heartRateResting: round(data.heart_rate_data?.summary?.resting_hr_bpm),
    activeMinutes,
    stressAvg: round(data.stress_data?.avg_stress_level),
  }
}

function round(v: number | undefined | null): number | null {
  if (v == null) return null
  return Math.round(v)
}
