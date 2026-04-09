import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/Header'
import { GarminConnectCard } from './GarminConnectCard'
import { isTerraConfigured } from '@/lib/integrations/terra'

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const session = await auth()
  const params = await searchParams

  const connection = await prisma.activityConnection.findUnique({
    where: { userId: session!.user!.id as string },
    select: { provider: true, connectedAt: true },
  })

  return (
    <div>
      <Header title="Integrations" />
      <div className="p-6 max-w-2xl space-y-6">
        {params.connected === '1' && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            Garmin connected successfully! Your activity data will sync automatically.
          </div>
        )}
        {params.error === '1' && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            Failed to connect Garmin. Please try again.
          </div>
        )}

        <GarminConnectCard
          connected={Boolean(connection)}
          connectedAt={connection?.connectedAt?.toISOString() ?? null}
          terraConfigured={isTerraConfigured()}
        />
      </div>
    </div>
  )
}
