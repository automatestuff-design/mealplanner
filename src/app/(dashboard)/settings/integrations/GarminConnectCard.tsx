'use client'

import { useState } from 'react'
import { Watch, CheckCircle2, AlertCircle, Loader2, Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface GarminConnectCardProps {
  connected: boolean
  connectedAt: string | null
  terraConfigured: boolean
}

export function GarminConnectCard({
  connected,
  connectedAt,
  terraConfigured,
}: GarminConnectCardProps) {
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Garmin? Your activity history will be kept.')) return
    setDisconnecting(true)
    setError(null)
    try {
      const res = await fetch('/api/integrations/terra/disconnect', { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to disconnect')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#007CC3]/10">
          <Watch className="h-6 w-6 text-[#007CC3]" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-base">Garmin Connect</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sync steps, calories burned, heart rate, and stress from your Garmin Fenix 7 Solar
            (or any Garmin device) to see your daily calorie balance in the planner.
          </p>
        </div>
        {connected && (
          <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Connected
          </div>
        )}
      </div>

      {/* What syncs */}
      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        {[
          'Steps & distance',
          'Active + total calories',
          'Resting heart rate',
          'Active minutes',
          'Stress level (0–100)',
          'Basal metabolic rate',
        ].map((item) => (
          <div key={item} className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
            {item}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      {!terraConfigured ? (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 space-y-1">
          <p className="font-medium">Setup required</p>
          <p>
            Add <code className="bg-amber-100 px-1 rounded">TERRA_API_KEY</code> and{' '}
            <code className="bg-amber-100 px-1 rounded">TERRA_DEV_ID</code> to your{' '}
            <code className="bg-amber-100 px-1 rounded">.env.local</code> to enable Garmin sync.
          </p>
          <p>
            Sign up free at{' '}
            <a
              href="https://dashboard.tryterra.co"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              dashboard.tryterra.co
            </a>
          </p>
        </div>
      ) : connected ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Connected{' '}
            {connectedAt
              ? new Date(connectedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : ''}
            . Data syncs automatically when your device uploads to Garmin Connect.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            {disconnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Unplug className="h-4 w-4" />
            )}
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button asChild className="bg-[#007CC3] hover:bg-[#006aaa]">
            <a href="/api/integrations/terra/connect">
              <Watch className="h-4 w-4 mr-2" />
              Connect Garmin
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            You will be taken to a secure Garmin login page.
          </p>
        </div>
      )}

      {/* Powered by */}
      <p className="text-xs text-muted-foreground border-t pt-3">
        Powered by{' '}
        <a
          href="https://tryterra.co"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Terra API
        </a>{' '}
        — supports Garmin, Apple Health, Oura, WHOOP, and 50+ other devices with the same
        integration.
      </p>
    </div>
  )
}
