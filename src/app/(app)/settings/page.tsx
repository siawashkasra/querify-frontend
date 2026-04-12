"use client"

import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Database, Plus } from "lucide-react"
import { connections } from "@/lib/api"
import ConnectionCard from "@/components/connections/ConnectionCard"
import EmptyState from "@/components/ui/EmptyState"
import { SkeletonCard } from "@/components/ui/Skeleton"
import type { Connection } from "@/types"

export default function SettingsPage() {
  const router = useRouter()

  const { data: allConnections, isLoading } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connections.list() as Promise<Connection[]>,
    staleTime: 30_000,
  })

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--text)]">Settings</h1>
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Database Connections</h2>
            <button
              onClick={() => router.push("/settings/connections/new")}
              className="flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark transition-colors"
            >
              <Plus size={13} />
              Add connection
            </button>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1].map((i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!isLoading && (!allConnections || allConnections.length === 0) && (
            <EmptyState
              icon={Database}
              heading="Add your first database connection"
              body="Connect a PostgreSQL database and Querify will introspect your schema and generate insights automatically."
              ctaLabel="Connect a database"
              onCta={() => router.push("/settings/connections/new")}
              className="py-8"
            />
          )}

          {!isLoading && allConnections && allConnections.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allConnections.map((c) => (
                <ConnectionCard key={c.id} connection={c} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
