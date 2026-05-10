"use client"

import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow, differenceInDays, format, parseISO } from "date-fns"
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react"
import { toast } from "react-hot-toast"
import { connections as connectionsApi, confidenceAnalytics } from "@/lib/api"
import { cn } from "@/lib/cn"
import Spinner from "@/components/ui/Spinner"
import ConfidenceTrendChart from "@/components/analytics/ConfidenceTrendChart"
import SchemaChangeModal from "@/components/chat/SchemaChangeModal"
import type { Connection, HealthLogEntry, HealthSummary, SchemaDiff } from "@/types"

// ─── Colour helpers ───────────────────────────────────────────────────────────

function uptimeColor(pct: number) {
  if (pct >= 99) return "text-success"
  if (pct >= 90) return "text-amber-500"
  return "text-danger"
}

function schemaAgeColor(days: number) {
  if (days < 7) return "text-success"
  if (days <= 30) return "text-amber-500"
  return "text-danger"
}

function confidenceColor(score: number | null) {
  if (score === null) return "text-[var(--text-muted)]"
  if (score >= 80) return "text-success"
  if (score >= 60) return "text-amber-500"
  return "text-danger"
}

function healthBarColor(status: HealthLogEntry["status"] | null) {
  if (!status) return "bg-[var(--border)]"
  if (status === "healthy") return "bg-success"
  if (status === "degraded") return "bg-amber-400"
  return "bg-danger"
}

// ─── 48-bar timeline ─────────────────────────────────────────────────────────

function HealthTimeline({ history }: { history: HealthLogEntry[] }) {
  const slots: (HealthLogEntry | null)[] = Array.from({ length: 48 }, (_, i) => history[i] ?? null)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-[2px] h-8">
        {slots.map((entry, i) => (
          <div
            key={i}
            title={entry ? `${format(parseISO(entry.checked_at), "MMM d HH:mm")} — ${entry.status}${entry.response_ms ? ` (${entry.response_ms}ms)` : ""}${entry.error_type ? ` — ${entry.error_type}` : ""}` : "No data"}
            className={cn("flex-1 rounded-sm transition-opacity hover:opacity-80 cursor-default", healthBarColor(entry?.status ?? null))}
            style={{ height: entry?.response_ms ? `${Math.min(100, Math.max(30, (entry.response_ms / 1000) * 30))}%` : "40%" }}
          />
        ))}
      </div>
      <p className="text-[10px] text-[var(--text-muted)]">← 48 hours ago · Refreshed every hour · Now →</p>
    </div>
  )
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{title}</p>
      </div>
      <div className="px-5 py-4 flex flex-col gap-4">{children}</div>
    </div>
  )
}

function StatRow({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="text-2xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)]">{sub}</p>}
    </div>
  )
}

// ─── Connection Health Panel ──────────────────────────────────────────────────

function HealthPanel({ connection }: { connection: Connection }) {
  const qc = useQueryClient()
  const isNew = !connection.last_tested_at

  const { data: summary, isLoading: summaryLoading } = useQuery<HealthSummary>({
    queryKey: ["health-summary", connection.id],
    queryFn: () => connectionsApi.healthSummary(connection.id) as Promise<HealthSummary>,
    staleTime: 60_000,
    enabled: !isNew,
  })

  const { data: history, isLoading: historyLoading } = useQuery<HealthLogEntry[]>({
    queryKey: ["health-history", connection.id],
    queryFn: () => connectionsApi.healthHistory(connection.id) as Promise<HealthLogEntry[]>,
    staleTime: 60_000,
    enabled: !isNew,
  })

  const checkMutation = useMutation({
    mutationFn: () => connectionsApi.healthCheck(connection.id) as Promise<unknown>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["health-summary", connection.id] })
      qc.invalidateQueries({ queryKey: ["health-history", connection.id] })
      qc.invalidateQueries({ queryKey: ["connections"] })
      toast.success("Health check complete")
    },
    onError: () => toast.error("Health check failed"),
  })

  const lastCheckedAgo = connection.last_tested_at
    ? formatDistanceToNow(new Date(connection.last_tested_at), { addSuffix: true })
    : null

  if (isNew) {
    return (
      <Panel title="Connection Health">
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Clock size={28} className="text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text)]">Health monitoring will begin within the next hour.</p>
          <p className="text-xs text-[var(--text-muted)]">Check back soon for reliability data.</p>
        </div>
      </Panel>
    )
  }

  const statusIcon = connection.status === "active"
    ? <CheckCircle size={20} className="text-success" />
    : connection.status === "error"
    ? <XCircle size={20} className="text-danger" />
    : <AlertTriangle size={20} className="text-amber-500" />

  const statusLabel = connection.status === "active" ? "Connected" : connection.status === "error" ? "Unreachable" : "Degraded"

  return (
    <Panel title="Connection Health">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3 flex-1">
          {summary && (
            <StatRow
              label="Uptime this week"
              value={<span className={uptimeColor(summary.uptime_pct)}>{summary.uptime_pct.toFixed(1)}%</span>}
              sub={summary.avg_response_ms ? `Average response time: ${summary.avg_response_ms}ms` : undefined}
            />
          )}
          {summaryLoading && <div className="h-10 rounded bg-[var(--surface-2)] animate-pulse w-32" />}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            {statusIcon}
            <span className="text-[var(--text)]">{statusLabel}</span>
          </div>
          {lastCheckedAgo && <p className="text-[11px] text-[var(--text-muted)]">Last checked {lastCheckedAgo}</p>}
          <button
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-white text-[var(--text-dim)] hover:border-brand/40 hover:text-brand hover:bg-[var(--brand-light)] transition-colors disabled:opacity-50"
          >
            {checkMutation.isPending ? <Spinner size="sm" /> : <RefreshCw size={11} />}
            Check now
          </button>
        </div>
      </div>

      {historyLoading && <div className="h-10 rounded bg-[var(--surface-2)] animate-pulse" />}
      {history && <HealthTimeline history={history} />}
    </Panel>
  )
}

// ─── Schema Freshness Panel ───────────────────────────────────────────────────

function SchemaPanel({ connection }: { connection: Connection }) {
  const [modalOpen, setModalOpen] = useState(false)
  const qc = useQueryClient()
  const [introspecting, setIntrospecting] = useState(false)
  const [inferring, setInferring] = useState(false)

  const { data: diff } = useQuery<SchemaDiff | null>({
    queryKey: ["schema-diff", connection.id],
    queryFn: () => connectionsApi.getSchemaDiff(connection.id) as Promise<SchemaDiff | null>,
    staleTime: 60_000,
  })

  const handleIntrospect = useCallback(async () => {
    setIntrospecting(true)
    const tid = toast.loading("Refreshing schema…")
    try {
      await connectionsApi.introspect(connection.id)
      await qc.invalidateQueries({ queryKey: ["connections"] })
      toast.success("Schema refreshed", { id: tid })
    } catch { toast.error("Schema refresh failed", { id: tid }) }
    finally { setIntrospecting(false) }
  }, [connection.id, qc])

  const handleInfer = useCallback(async () => {
    setInferring(true)
    const tid = toast.loading("Refreshing context…")
    try {
      await connectionsApi.inferContext(connection.id)
      await qc.invalidateQueries({ queryKey: ["connections"] })
      toast.success("Context refreshed", { id: tid })
    } catch { toast.error("Context refresh failed", { id: tid }) }
    finally { setInferring(false) }
  }, [connection.id, qc])

  const daysOld = connection.last_introspected_at
    ? differenceInDays(new Date(), new Date(connection.last_introspected_at))
    : null

  const tableCount = connection.table_count ?? null

  return (
    <Panel title="Schema Freshness">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          {daysOld !== null ? (
            <p className={cn("text-2xl font-bold leading-tight", schemaAgeColor(daysOld))}>
              {daysOld === 0 ? "Updated today" : `Updated ${daysOld} day${daysOld === 1 ? "" : "s"} ago`}
            </p>
          ) : (
            <p className="text-2xl font-bold text-[var(--text-muted)]">Not yet introspected</p>
          )}
          {tableCount !== null && <p className="text-xs text-[var(--text-muted)]">{tableCount} table{tableCount !== 1 ? "s" : ""} in your database</p>}
        </div>

        {diff?.has_changes ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 shrink-0">
            <AlertTriangle size={12} />
            Schema changed
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-xs text-success shrink-0">
            <CheckCircle size={12} />
            Schema up to date
          </div>
        )}
      </div>

      {diff?.has_changes && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle size={14} className="text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">Schema has changed since last context update</p>
            <p className="text-xs text-amber-700 mt-0.5">{diff.summary}</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="text-xs font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap underline underline-offset-2">
            View changes
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleIntrospect}
          disabled={introspecting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-white text-[var(--text-dim)] hover:border-brand/40 hover:text-brand hover:bg-[var(--brand-light)] transition-colors disabled:opacity-50"
        >
          {introspecting ? <Spinner size="sm" /> : <RefreshCw size={11} />}
          Refresh schema
        </button>
        <button
          onClick={handleInfer}
          disabled={inferring}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-white text-[var(--text-dim)] hover:border-brand/40 hover:text-brand hover:bg-[var(--brand-light)] transition-colors disabled:opacity-50"
        >
          {inferring ? <Spinner size="sm" /> : <RefreshCw size={11} />}
          Refresh context
        </button>
      </div>

      {modalOpen && diff && (
        <SchemaChangeModal
          diff={diff}
          connectionId={connection.id}
          isPending={false}
          onClose={() => setModalOpen(false)}
          onAcknowledge={async (refresh) => {
            if (refresh) await handleInfer()
            await qc.invalidateQueries({ queryKey: ["schema-diff", connection.id] })
            setModalOpen(false)
          }}
        />
      )}
    </Panel>
  )
}

// ─── AI Accuracy Panel ────────────────────────────────────────────────────────

const STALENESS_CHIP: Record<string, { bg: string; text: string; label: string }> = {
  fresh: { bg: "bg-green-50 border-green-200", text: "text-success", label: "Context is current" },
  aging: { bg: "bg-amber-50 border-amber-200", text: "text-amber-600", label: "Context is aging" },
  stale: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Refresh recommended" },
  very_stale: { bg: "bg-red-50 border-red-200", text: "text-danger", label: "Refresh recommended" },
}

function AccuracyPanel({ connection }: { connection: Connection }) {
  const hasQueries = !!connection.last_tested_at

  const { data: trend, isLoading } = useQuery({
    queryKey: ["confidence-trend", connection.id, 14],
    queryFn: () => confidenceAnalytics.trend(connection.id, 14),
    staleTime: 5 * 60_000,
    enabled: hasQueries,
  })

  if (!hasQueries) {
    return (
      <Panel title="AI Accuracy">
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-[var(--text)]">Run some queries to see AI accuracy data.</p>
          <p className="text-xs text-[var(--text-muted)]">Confidence scores will appear here after your first query.</p>
        </div>
      </Panel>
    )
  }

  const stalenessLevel = connection.staleness_level
  const stalenessCfg = stalenessLevel ? STALENESS_CHIP[stalenessLevel] : null
  const daysOld = connection.last_introspected_at
    ? differenceInDays(new Date(), new Date(connection.last_introspected_at))
    : null

  return (
    <Panel title="AI Accuracy">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          {trend?.overall_avg !== null && trend?.overall_avg !== undefined ? (
            <p className={cn("text-2xl font-bold leading-tight", confidenceColor(trend.overall_avg))}>
              {trend.overall_avg}/100
            </p>
          ) : (
            <p className="text-2xl font-bold text-[var(--text-muted)]">—/100</p>
          )}
          <p className="text-xs text-[var(--text-muted)]">Average confidence this week</p>
          {trend?.trend_direction && trend.change_from_previous_period !== null && (
            <p className={cn("text-xs font-medium mt-0.5", trend.trend_direction === "improving" ? "text-success" : trend.trend_direction === "deteriorating" ? "text-danger" : "text-[var(--text-muted)]")}>
              {trend.trend_direction === "improving" ? "↑ Improving" : trend.trend_direction === "deteriorating" ? "↓ Declining" : "→ Stable"}
              {" "}{trend.change_from_previous_period !== null ? `${Math.abs(trend.change_from_previous_period)}% vs last period` : ""}
            </p>
          )}
        </div>

        {stalenessCfg && (
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium shrink-0", stalenessCfg.bg, stalenessCfg.text)}>
            {stalenessLevel === "fresh" ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
            {stalenessLevel === "aging" && daysOld !== null ? `Context is ${daysOld} day${daysOld !== 1 ? "s" : ""} old` : stalenessCfg.label}
          </div>
        )}
      </div>

      {isLoading && <div className="h-40 rounded bg-[var(--surface-2)] animate-pulse" />}
      {trend && (
        <ConfidenceTrendChart trend={trend} className="mt-1" />
      )}
    </Panel>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ReliabilityTab({ connection }: { connection: Connection }) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <HealthPanel connection={connection} />
      <SchemaPanel connection={connection} />
      <AccuracyPanel connection={connection} />
    </div>
  )
}
