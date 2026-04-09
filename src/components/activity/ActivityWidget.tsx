'use client'

import { useEffect, useState } from 'react'
import { Footprints, Flame, Heart, Clock, Zap, Watch } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface DailyActivity {
  steps: number | null
  activeKcal: number | null
  bmrKcal: number | null
  totalKcal: number | null
  heartRateAvg: number | null
  heartRateResting: number | null
  activeMinutes: number | null
  stressAvg: number | null
}

interface ActivityWidgetProps {
  date: string // YYYY-MM-DD
  caloriesConsumed?: number // from meal plan entries for this day
  calorieGoal?: number // from UserGoals
}

export function ActivityWidget({ date, caloriesConsumed, calorieGoal }: ActivityWidgetProps) {
  const [activity, setActivity] = useState<DailyActivity | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/activity?date=${date}`)
      .then((r) => r.json())
      .then(({ activity, connection }) => {
        setActivity(activity ?? null)
        setConnected(Boolean(connection))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [date])

  if (loading) return null

  if (!connected) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        <Watch className="h-5 w-5 mx-auto mb-1 opacity-50" />
        <p>Connect your Garmin to see daily activity here.</p>
        <a
          href="/settings/integrations"
          className="text-primary hover:underline text-xs mt-1 inline-block"
        >
          Set up Garmin →
        </a>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground text-center">
        <Watch className="h-5 w-5 mx-auto mb-1 opacity-40" />
        No Garmin data yet for {date}. Data syncs automatically after your device uploads.
      </div>
    )
  }

  // Calorie balance: burned − consumed
  const burned = activity.totalKcal
  const balance =
    burned != null && caloriesConsumed != null ? burned - caloriesConsumed : null

  const stressLabel =
    activity.stressAvg == null
      ? null
      : activity.stressAvg < 26
      ? 'Rest'
      : activity.stressAvg < 51
      ? 'Low'
      : activity.stressAvg < 76
      ? 'Medium'
      : 'High'

  return (
    <div className="space-y-3">
      {/* Calorie balance */}
      {burned != null && (
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Calorie Balance — {date}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <div className="text-lg font-semibold text-orange-500">{burned.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">burned</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-500">
                {caloriesConsumed?.toLocaleString() ?? '—'}
              </div>
              <div className="text-xs text-muted-foreground">consumed</div>
            </div>
            <div>
              {balance != null ? (
                <>
                  <div
                    className={cn(
                      'text-lg font-semibold',
                      balance >= 0 ? 'text-green-600' : 'text-red-500'
                    )}
                  >
                    {balance >= 0 ? '+' : ''}
                    {balance.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {balance >= 0 ? 'surplus' : 'deficit'}
                  </div>
                </>
              ) : (
                <div className="text-lg font-semibold text-muted-foreground">—</div>
              )}
            </div>
          </div>
          {calorieGoal && (
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((caloriesConsumed ?? 0) / calorieGoal) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {activity.steps != null && (
          <StatCard
            icon={<Footprints className="h-4 w-4" />}
            label="Steps"
            value={activity.steps.toLocaleString()}
            color="text-blue-600"
          />
        )}
        {activity.activeKcal != null && (
          <StatCard
            icon={<Flame className="h-4 w-4" />}
            label="Active kcal"
            value={activity.activeKcal.toLocaleString()}
            color="text-orange-500"
          />
        )}
        {activity.activeMinutes != null && (
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Active min"
            value={String(activity.activeMinutes)}
            color="text-green-600"
          />
        )}
        {activity.heartRateResting != null && (
          <StatCard
            icon={<Heart className="h-4 w-4" />}
            label="Resting HR"
            value={`${activity.heartRateResting} bpm`}
            color="text-red-500"
          />
        )}
        {activity.heartRateAvg != null && (
          <StatCard
            icon={<Heart className="h-4 w-4" />}
            label="Avg HR"
            value={`${activity.heartRateAvg} bpm`}
            color="text-red-400"
          />
        )}
        {stressLabel != null && (
          <StatCard
            icon={<Zap className="h-4 w-4" />}
            label="Stress"
            value={`${stressLabel} (${activity.stressAvg})`}
            color={
              activity.stressAvg! < 26
                ? 'text-green-600'
                : activity.stressAvg! < 51
                ? 'text-yellow-600'
                : 'text-red-500'
            }
          />
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="rounded-md border p-2.5 flex flex-col gap-1">
      <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', color)}>
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  )
}
