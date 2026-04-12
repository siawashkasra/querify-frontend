"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Database, Plus, Info, ExternalLink, Wifi } from "lucide-react"
import { connections as connectionsApi } from "@/lib/api"
import ConnectionDetailCard from "@/components/connections/ConnectionDetailCard"
import EditConnectionModal from "@/components/connections/EditConnectionModal"
import DeleteConfirmModal from "@/components/connections/DeleteConfirmModal"
import EmptyState from "@/components/ui/EmptyState"
import { SkeletonCard } from "@/components/ui/Skeleton"
import { cn } from "@/lib/cn"
import type { Connection } from "@/types"

type Tab = "connections" | "about"

function AboutTab() {
  const [latency, setLatency] = useState<number | null>(null)
  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">("checking")

  useEffect(() => {
    const ping = async () => {
      const t = Date.now()
      try {
        await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/health", { method: "GET", cache: "no-store" })
        setLatency(Date.now() - t)
        setApiStatus("ok")
      } catch {
        setApiStatus("error")
      }
    }
    ping()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-[var(--border)] bg-white p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand/10">
            <span className="font-mono font-bold text-brand text-sm">Q</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Querify</p>
            <p className="text-xs text-[var(--text-muted)]">Phase 2 UI — AI analytics for SaaS founders</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">API Status</p>
          <div className="flex items-center gap-2 text-sm">
            <Wifi size={14} className={apiStatus === "ok" ? "text-success" : apiStatus === "error" ? "text-danger" : "text-[var(--text-muted)]"} />
            {apiStatus === "checking" && <span className="text-[var(--text-muted)]">Checking…</span>}
            {apiStatus === "ok" && <span className="text-success">Connected {latency !== null && `— ${latency}ms`}</span>}
            {apiStatus === "error" && <span className="text-danger">Cannot reach API</span>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-5 flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Links</p>
        {[
          { label: "Help center", href: "/help" },
          { label: "Status page", href: "https://status.querify.app" },
          { label: "Privacy Policy", href: "/privacy" },
          { label: "Terms of Service", href: "/terms" },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
            className="flex items-center justify-between text-sm text-[var(--text-dim)] hover:text-brand transition-colors group"
          >
            {label}
            <ExternalLink size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />
          </a>
        ))}
      </div>
    </div>
  )
}

function ConnectionsTab() {
  const router = useRouter()
  const [editTarget, setEditTarget] = useState<Connection | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Connection | null>(null)

  const { data: allConnections, isLoading } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list() as Promise<Connection[]>,
    staleTime: 30_000,
  })

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">
          {allConnections?.length ?? 0} connection{(allConnections?.length ?? 0) !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => router.push("/settings/connections/new")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand text-white hover:bg-brand-dark transition-colors"
        >
          <Plus size={12} />
          Add connection
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => <SkeletonCard key={i} className="h-48" />)}
        </div>
      )}

      {!isLoading && (!allConnections || allConnections.length === 0) && (
        <EmptyState
          icon={Database}
          heading="Add your first database connection"
          body="Connect a PostgreSQL database and Querify will introspect your schema and generate insights automatically."
          ctaLabel="Connect a database"
          onCta={() => router.push("/settings/connections/new")}
          className="py-12"
        />
      )}

      {!isLoading && allConnections && allConnections.length > 0 && (
        <div className="flex flex-col gap-4">
          {allConnections.map((c) => (
            <ConnectionDetailCard
              key={c.id}
              connection={c}
              onEdit={() => setEditTarget(c)}
              onDelete={() => setDeleteTarget(c)}
            />
          ))}
        </div>
      )}

      <EditConnectionModal connection={editTarget} onClose={() => setEditTarget(null)} />
      <DeleteConfirmModal connection={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </>
  )
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "connections", label: "Connections", icon: Database },
  { id: "about", label: "About", icon: Info },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("connections")

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <h1 className="text-lg font-semibold text-[var(--text)]">Settings</h1>

        <div className="flex gap-1 border-b border-[var(--border)]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === id
                  ? "border-brand text-brand"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-dim)]"
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "connections" && <ConnectionsTab />}
        {activeTab === "about" && <AboutTab />}
      </div>
    </div>
  )
}
