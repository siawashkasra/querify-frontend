"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { formatDistanceToNow, format } from "date-fns"
import {
  Bug, Search, Loader2, CheckCircle2, XCircle,
  RefreshCw, Database, Clock, Shield, AlertTriangle,
} from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { ConnectionDebugResponse, ConnectionDebug, ConnectionHealthCheck } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return d
}

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  degraded: "bg-amber-50 text-amber-700 border-amber-200",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
  error: "bg-red-50 text-red-600 border-red-200",
}
const DB_TYPE_COLOR: Record<string, string> = {
  postgresql: "bg-blue-50 text-blue-700 border-blue-200",
  mysql: "bg-orange-50 text-orange-700 border-orange-200",
  mssql: "bg-indigo-50 text-indigo-700 border-indigo-200",
  bigquery: "bg-teal-50 text-teal-700 border-teal-200",
  snowflake: "bg-sky-50 text-sky-700 border-sky-200",
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-100", className)} />
}

// ── Masked field ──────────────────────────────────────────────────────────────

function MaskedField({ label }: { label: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-mono text-gray-400 tracking-widest select-none">••••••••</p>
    </div>
  )
}

// ── Health check dots ─────────────────────────────────────────────────────────

function HealthDot({ check }: { check: ConnectionHealthCheck }) {
  return (
    <div
      className={cn(
        "group relative w-6 h-6 rounded-full flex items-center justify-center cursor-default",
        check.passed ? "bg-green-100" : "bg-red-100"
      )}
    >
      {check.passed
        ? <CheckCircle2 size={13} className="text-green-600" />
        : <XCircle size={13} className="text-red-500" />}
      {/* Tooltip */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col gap-0.5 bg-gray-900 text-white text-[10px] rounded px-2 py-1.5 whitespace-nowrap z-10 min-w-max">
        <span>{format(new Date(check.checked_at), "HH:mm:ss")}</span>
        {check.response_ms != null && <span>{check.response_ms} ms</span>}
        {check.error && <span className="text-red-300">{check.error}</span>}
      </div>
    </div>
  )
}

// ── Connection debug card ─────────────────────────────────────────────────────

function ConnectionCard({ conn }: { conn: ConnectionDebug }) {
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({})

  const retestMutation = useMutation({
    mutationFn: () => adminApi.debugRetestConnection(conn.id),
    onSuccess: () => setActionFeedback((f) => ({ ...f, retest: "Retest queued" })),
  })
  const refreshMutation = useMutation({
    mutationFn: () => adminApi.debugRefreshSchema(conn.id),
    onSuccess: () => setActionFeedback((f) => ({ ...f, refresh: "Schema refresh queued" })),
  })
  const contextMutation = useMutation({
    mutationFn: () => adminApi.debugRerunContext(conn.id),
    onSuccess: () => setActionFeedback((f) => ({ ...f, context: "Context re-inference queued" })),
  })

  const isDegraded = conn.status === "degraded" || conn.status === "error"
  const recentChecks = conn.health_checks.slice(-5)

  return (
    <div className={cn(
      "bg-white rounded-xl border p-5 flex flex-col gap-4",
      isDegraded ? "border-amber-200" : "border-gray-200"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Database size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{conn.name ?? "(unnamed)"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
                DB_TYPE_COLOR[conn.db_type.toLowerCase()] ?? "bg-gray-50 text-gray-600 border-gray-200"
              )}>{conn.db_type}</span>
              <span className={cn(
                "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
                STATUS_COLOR[conn.status] ?? "bg-gray-50 text-gray-500 border-gray-200"
              )}>{conn.status}</span>
            </div>
          </div>
        </div>
        {/* Credential mask notice */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded px-2 py-1">
          <Shield size={10} className="text-gray-400" />
          Credentials hidden
        </div>
      </div>

      {/* Masked credentials */}
      <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3 border border-dashed border-gray-200">
        <MaskedField label="Host" />
        <MaskedField label="Username" />
        <MaskedField label="Password" />
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Last introspection</p>
          <p className="text-xs text-gray-600">
            {conn.last_introspected_at
              ? formatDistanceToNow(new Date(conn.last_introspected_at), { addSuffix: true })
              : "Never"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Table count</p>
          <p className="text-sm font-medium text-gray-700 tabular-nums">{conn.table_count ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Context metrics</p>
          <p className="text-sm text-gray-700 tabular-nums">{conn.context_summary?.metrics_count ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Context entities</p>
          <p className="text-sm text-gray-700 tabular-nums">{conn.context_summary?.entities_count ?? "—"}</p>
        </div>
      </div>

      {/* Context version */}
      {conn.context_summary?.version != null && (
        <p className="text-[11px] text-gray-400">
          Context layer version: <span className="font-mono font-medium text-gray-600">v{conn.context_summary.version}</span>
        </p>
      )}

      {/* Last 5 health checks */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Last 5 health checks</p>
        {recentChecks.length === 0 ? (
          <p className="text-xs text-gray-400">No health check history.</p>
        ) : (
          <div className="flex items-center gap-1.5">
            {recentChecks.map((c, i) => <HealthDot key={i} check={c} />)}
            {recentChecks.length > 0 && (
              <span className="text-[10px] text-gray-400 ml-1">
                {recentChecks.filter((c) => c.passed).length}/{recentChecks.length} passed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
        {Object.values(actionFeedback).length > 0 ? (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <CheckCircle2 size={12} />
            {Object.values(actionFeedback).join(" · ")}
          </span>
        ) : (
          <>
            <button
              onClick={() => retestMutation.mutate()}
              disabled={retestMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors disabled:opacity-50"
            >
              {retestMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              Trigger retest
            </button>
            <button
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {refreshMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Database size={11} />}
              Refresh schema
            </button>
            <button
              onClick={() => contextMutation.mutate()}
              disabled={contextMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {contextMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <AlertTriangle size={11} />}
              Re-infer context
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConnectionDebuggerPage() {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 400)

  const { data, isLoading, isFetching } = useQuery<ConnectionDebugResponse[]>({
    queryKey: ["admin-debug-connections", debouncedQuery],
    queryFn: () => adminApi.debugConnections(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  })

  const tenants = data ?? []
  const hasSearched = debouncedQuery.length >= 2

  return (
    <div className="p-6 max-w-[1000px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bug size={18} className="text-gray-400" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Connection Debugger</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Inspect connection health and schema status — credentials are never shown
          </p>
        </div>
      </div>

      {/* Credential mask notice */}
      <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Shield size={14} className="text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800 font-medium">
          Host, username, and password are permanently masked. This page never exposes plaintext credentials.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          autoFocus
          placeholder="Search by tenant name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
        />
        {isFetching && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {/* Results */}
      {isLoading && hasSearched ? (
        <div className="flex flex-col gap-6">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : hasSearched && tenants.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Bug size={28} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No tenants found for "{debouncedQuery}"</p>
        </div>
      ) : tenants.length > 0 ? (
        <div className="flex flex-col gap-8">
          {tenants.map((t) => (
            <div key={t.tenant_id}>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm font-semibold text-gray-800">{t.tenant_name}</p>
                <span className="text-xs text-gray-400">{t.connections.length} connection{t.connections.length !== 1 ? "s" : ""}</span>
              </div>
              {t.connections.length === 0 ? (
                <p className="text-sm text-gray-400 pl-2">No connections.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {t.connections.map((c) => <ConnectionCard key={c.id} conn={c} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <Search size={28} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Enter at least 2 characters to search</p>
        </div>
      )}
    </div>
  )
}
