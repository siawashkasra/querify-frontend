"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Database, AlertTriangle, RefreshCw } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { connections as connectionsApi } from "@/lib/api"
import { cn } from "@/lib/cn"
import { useAppStore } from "@/store/appStore"
import ConnectionCard from "@/components/connections/ConnectionCard"
import EmptyState from "@/components/ui/EmptyState"
import { SkeletonCard } from "@/components/ui/Skeleton"
import CanDo from "@/components/auth/CanDo"
import type { Connection } from "@/types"

export default function ConnectionsPage() {
  const router = useRouter()
  const { activeConnectionId } = useAppStore()

  const { data: conns, isLoading, error, refetch } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list() as Promise<Connection[]>,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text)]">Connections</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Manage the databases Querify reads from.</p>
          </div>
          <CanDo permission="connections:create">
            <Link href="/settings/connections/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand/90 transition-colors">
              <Plus size={14} /> Add connection
            </Link>
          </CanDo>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-surface-2 px-4 py-3 text-sm text-[var(--text-muted)]">
            <AlertTriangle size={14} className="text-warning shrink-0" /> Could not load connections.
            <button onClick={() => refetch()} className="flex items-center gap-1 text-xs text-brand hover:underline"><RefreshCw size={12} /> Retry</button>
          </div>
        ) : !conns?.length ? (
          <CanDo permission="connections:create"
            fallback={<EmptyState icon={Database} heading="No connections yet" body="Ask your workspace admin to connect a database." className="max-w-sm" />}>
            <EmptyState icon={Database} heading="Connect your first database"
              body="Querify will automatically understand your schema and build your dashboard."
              ctaLabel="Connect a database" onCta={() => router.push("/settings/connections/new")} className="max-w-sm" />
          </CanDo>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {conns.map((c) => (
              <ConnectionCard key={c.id} connection={c} className={cn(c.id === activeConnectionId && "ring-1 ring-brand/40")} />
            ))}
            <CanDo permission="connections:create">
              <Link href="/settings/connections/new"
                className="rounded-lg border border-dashed border-[var(--border)] bg-surface-2/50 p-4 flex flex-col items-center justify-center gap-2 text-sm text-[var(--text-muted)] hover:border-brand/40 hover:text-brand hover:bg-surface-2 transition-colors min-h-[120px]">
                <Plus size={18} /> Add connection
              </Link>
            </CanDo>
          </div>
        )}
      </div>
    </div>
  )
}
