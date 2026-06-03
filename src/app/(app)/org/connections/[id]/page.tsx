"use client"

import { use, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow, format, eachDayOfInterval, subDays, startOfDay } from "date-fns"
import {
  CheckCircle2, XCircle, RefreshCw, Loader2,
  Database, Shield, ShieldOff, Calendar, Clock,
  ChevronRight, ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { connections as connectionsApi } from "@/lib/api"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Spinner from "@/components/ui/Spinner"
import { DbTypeBadge } from "@/components/connections/DbTypeBadge"
import { cn } from "@/lib/cn"
import type { Connection, SchemaSnapshot, HealthLogEntry } from "@/types"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContextLayer {
  metrics?: { name: string; description?: string; formula?: string }[]
  entities?: { name: string; type?: string }[]
  synonyms?: { term: string; alternatives?: string[] }[]
}

type TabId = "overview" | "schema" | "context"

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "schema", label: "Schema" },
  { id: "context", label: "Context" },
]

const STATUS_BADGE: Record<string, "active" | "degraded" | "inactive" | "pending"> = {
  active: "active",
  error: "degraded",
  pending: "pending",
  untested: "inactive",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-surface-2", className)} />
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border)] last:border-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] shrink-0 mt-0.5 w-32">
        {label}
      </p>
      <div className="flex-1 text-sm text-[var(--text)]">{children}</div>
    </div>
  )
}

// ── Health timeline (7 days) ──────────────────────────────────────────────────

function HealthTimeline({ entries }: { entries: HealthLogEntry[] }) {
  // Build one slot per day for last 7 days
  const today = startOfDay(new Date())
  const days = eachDayOfInterval({ start: subDays(today, 6), end: today })

  const dayMap = new Map<string, HealthLogEntry[]>()
  for (const entry of entries) {
    const key = format(new Date(entry.checked_at), "yyyy-MM-dd")
    if (!dayMap.has(key)) dayMap.set(key, [])
    dayMap.get(key)!.push(entry)
  }

  return (
    <div>
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
        Health — last 7 days
      </p>
      <div className="flex gap-1.5 items-end">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd")
          const dayEntries = dayMap.get(key) ?? []
          const total = dayEntries.length
          const healthy = dayEntries.filter((e) => e.status === "healthy").length
          const allHealthy = total > 0 && healthy === total
          const allFailed = total > 0 && healthy === 0
          const mixed = total > 0 && !allHealthy && !allFailed
          const noData = total === 0

          return (
            <div key={key} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={cn(
                  "w-full rounded-sm h-8 transition-colors",
                  noData ? "bg-surface-2" :
                  allHealthy ? "bg-success" :
                  allFailed ? "bg-danger" :
                  "bg-warning"
                )}
                title={noData ? "No data" : `${healthy}/${total} checks passed`}
              />
              <p className="text-[9px] text-[var(--text-muted)]">{format(day, "d")}</p>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-success inline-block" /> All passing</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-warning inline-block" /> Mixed</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-danger inline-block" /> Failed</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-surface-2 border border-[var(--border)] inline-block" /> No data</span>
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ conn }: { conn: Connection }) {
  const { data: healthHistory, isLoading: historyLoading } = useQuery<HealthLogEntry[]>({
    queryKey: ["connection-health-history", conn.id],
    queryFn: () => connectionsApi.healthHistory(conn.id) as Promise<HealthLogEntry[]>,
    staleTime: 2 * 60_000,
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Details */}
      <div className="bg-surface rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] px-4">
        <DetailRow label="Status">
          <Badge variant={STATUS_BADGE[conn.status] ?? "default"}>{conn.status}</Badge>
        </DetailRow>
        <DetailRow label="Database type">
          <DbTypeBadge dbType={conn.db_type} />
        </DetailRow>
        <DetailRow label="SSL mode">
          <span className="font-mono text-xs">{conn.ssl_mode}</span>
        </DetailRow>
        <DetailRow label="Host">
          {/* Host shown — this is connection detail for tenant admin, credentials are credentials (password/user not shown) */}
          <span className="font-mono text-xs">{conn.host}:{conn.port}</span>
        </DetailRow>
        <DetailRow label="Database">
          <span className="font-mono text-xs">{conn.database_name}</span>
        </DetailRow>
        <DetailRow label="Username">
          <span className="font-mono text-xs">{conn.username}</span>
        </DetailRow>
        <DetailRow label="Password">
          {/* Password always masked */}
          <span className="font-mono text-xs tracking-widest text-[var(--text-muted)] select-none">
            ••••••••
          </span>
        </DetailRow>
        <DetailRow label="Last tested">
          {conn.last_tested_at
            ? formatDistanceToNow(new Date(conn.last_tested_at), { addSuffix: true })
            : "Never"}
        </DetailRow>
        <DetailRow label="Last introspected">
          {conn.last_introspected_at
            ? formatDistanceToNow(new Date(conn.last_introspected_at), { addSuffix: true })
            : "Never"}
        </DetailRow>
        <DetailRow label="Tables">
          {conn.table_count ?? "—"}
        </DetailRow>
        <DetailRow label="Created">
          {format(new Date(conn.created_at), "MMM d, yyyy")}
        </DetailRow>
      </div>

      {/* Health timeline */}
      <div className="bg-surface rounded-xl border border-[var(--border)] p-5">
        {historyLoading
          ? <Skeleton className="h-20" />
          : <HealthTimeline entries={healthHistory ?? []} />}
      </div>
    </div>
  )
}

// ── Schema tab ────────────────────────────────────────────────────────────────

function SchemaTab({ connId }: { connId: string }) {
  const { data: schema, isLoading } = useQuery<SchemaSnapshot>({
    queryKey: ["connection-schema", connId],
    queryFn: () => connectionsApi.getSchema(connId) as Promise<SchemaSnapshot>,
    staleTime: 5 * 60_000,
  })

  const tables = schema?.snapshot?.tables ?? []

  if (isLoading) return <Skeleton className="h-64" />

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Database size={28} className="text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">No schema data. Trigger a schema refresh to introspect tables.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--text-muted)]">
        {tables.length} tables · last updated {schema?.created_at
          ? formatDistanceToNow(new Date(schema.created_at), { addSuffix: true })
          : "—"}
        {schema?.snapshot?.capped && (
          <span className="ml-2 text-warning">(schema capped — not all tables shown)</span>
        )}
      </p>
      <div className="rounded-xl border border-[var(--border)] bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-surface-2">
              {["Table", "Schema", "Columns", "Row estimate"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {tables.map((t) => (
              <tr key={`${t.schema}.${t.name}`} className="hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-[var(--text)]">{t.name}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{t.schema}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-dim)] tabular-nums">{t.columns.length}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-dim)] tabular-nums">
                  {t.row_estimate > 0 ? t.row_estimate.toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Context tab ───────────────────────────────────────────────────────────────

function ContextTab({ connId }: { connId: string }) {
  const { data: ctx, isLoading } = useQuery<ContextLayer>({
    queryKey: ["connection-context", connId],
    queryFn: () => connectionsApi.getContext(connId) as Promise<ContextLayer>,
    staleTime: 5 * 60_000,
  })

  if (isLoading) return <Skeleton className="h-64" />

  const metrics = ctx?.metrics ?? []
  const entities = ctx?.entities ?? []
  const synonyms = ctx?.synonyms ?? []
  const hasAny = metrics.length > 0 || entities.length > 0 || synonyms.length > 0

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">No context layer yet. Trigger a context re-inference to generate business logic.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Metrics */}
      {metrics.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Metrics detected ({metrics.length})
          </p>
          <div className="flex flex-col gap-2">
            {metrics.map((m, i) => (
              <div key={i} className="bg-surface rounded-lg border border-[var(--border)] p-3">
                <p className="text-sm font-medium text-[var(--text)]">{m.name}</p>
                {m.description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{m.description}</p>}
                {m.formula && (
                  <code className="text-[11px] text-brand-mid font-mono mt-1 block">{m.formula}</code>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entities */}
      {entities.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Entities detected ({entities.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {entities.map((e, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-[var(--border)] text-xs">
                <span className="font-medium text-[var(--text)]">{e.name}</span>
                {e.type && <span className="text-[var(--text-muted)]">· {e.type}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Synonyms */}
      {synonyms.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Synonyms ({synonyms.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {synonyms.map((s, i) => (
              <div key={i} className="text-xs text-[var(--text-dim)] flex items-start gap-2">
                <span className="font-medium text-[var(--text)] shrink-0">{s.term}</span>
                <ChevronRight size={11} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                <span className="text-[var(--text-muted)]">{(s.alternatives ?? []).join(", ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-[var(--text-muted)] italic">Context layer is read-only. Re-run inference to update.</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConnectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabId>("overview")

  const { data: conn, isLoading } = useQuery<Connection>({
    queryKey: ["connection", id],
    queryFn: () => connectionsApi.get(id) as Promise<Connection>,
    staleTime: 60_000,
  })

  const refreshSchemaMutation = useMutation({
    mutationFn: () => connectionsApi.introspect(id),
    onSuccess: () => {
      toast.success("Schema refresh queued.")
      qc.invalidateQueries({ queryKey: ["connection-schema", id] })
      qc.invalidateQueries({ queryKey: ["connection", id] })
    },
    onError: () => toast.error("Failed to queue schema refresh."),
  })

  const refreshContextMutation = useMutation({
    mutationFn: () => connectionsApi.inferContext(id),
    onSuccess: () => {
      toast.success("Context re-inference queued.")
      qc.invalidateQueries({ queryKey: ["connection-context", id] })
    },
    onError: () => toast.error("Failed to queue context re-inference."),
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Back */}
      <Link
        href="/org/connections"
        className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] w-fit transition-colors"
      >
        <ArrowLeft size={14} />
        All connections
      </Link>

      {/* Header */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
      ) : conn ? (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-[var(--text)]">{conn.name}</h2>
              <Badge variant={STATUS_BADGE[conn.status] ?? "default"}>{conn.status}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <DbTypeBadge dbType={conn.db_type} />
              <span className="text-xs text-[var(--text-muted)]">{conn.database_name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refreshSchemaMutation.mutate()}
              loading={refreshSchemaMutation.isPending}
            >
              <RefreshCw size={12} />
              Refresh schema
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refreshContextMutation.mutate()}
              loading={refreshContextMutation.isPending}
            >
              <RefreshCw size={12} />
              Refresh context
            </Button>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-[var(--border)] -mb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-brand text-brand"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-dim)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {conn && (
        <>
          {activeTab === "overview" && <OverviewTab conn={conn} />}
          {activeTab === "schema" && <SchemaTab connId={id} />}
          {activeTab === "context" && <ContextTab connId={id} />}
        </>
      )}
      {isLoading && <Skeleton className="h-64" />}
    </div>
  )
}
