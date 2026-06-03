"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import {
  Wifi, Loader2, RefreshCw, Mail, AlertTriangle,
  CheckCircle2, XCircle,
} from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { ConnectionHealthRow } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  degraded: "bg-amber-50 text-amber-700 border-amber-200",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
  error: "bg-red-50 text-red-600 border-red-200",
}

const STATUS_ICON: Record<string, React.ElementType> = {
  active: CheckCircle2,
  degraded: AlertTriangle,
  inactive: XCircle,
  error: XCircle,
}

const DB_TYPE_COLOR: Record<string, string> = {
  postgresql: "bg-blue-50 text-blue-700 border-blue-200",
  mysql: "bg-orange-50 text-orange-700 border-orange-200",
  mssql: "bg-indigo-50 text-indigo-700 border-indigo-200",
  sqlite: "bg-gray-50 text-gray-600 border-gray-200",
  bigquery: "bg-teal-50 text-teal-700 border-teal-200",
  snowflake: "bg-sky-50 text-sky-700 border-sky-200",
  redshift: "bg-pink-50 text-pink-700 border-pink-200",
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-100", className)} />
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConnectionHealthPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("")
  const [dbTypeFilter, setDbTypeFilter] = useState("")
  const [page, setPage] = useState(1)
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({})

  const params = new URLSearchParams()
  if (statusFilter) params.set("status", statusFilter)
  if (dbTypeFilter) params.set("db_type", dbTypeFilter)
  params.set("page", String(page))
  params.set("page_size", "25")

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-connections-health", statusFilter, dbTypeFilter, page],
    queryFn: () => adminApi.allConnections(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  const retestMutation = useMutation({
    mutationFn: (id: string) => adminApi.retestConnection(id),
    onSuccess: (_, id) => {
      setActionFeedback((f) => ({ ...f, [id]: "Retest queued" }))
      setTimeout(() => qc.invalidateQueries({ queryKey: ["admin-connections-health"] }), 3000)
    },
  })

  const notifyMutation = useMutation({
    mutationFn: (id: string) => adminApi.notifyConnectionTenant(id),
    onSuccess: (_, id) => {
      setActionFeedback((f) => ({ ...f, [id]: "Email sent" }))
    },
  })

  const connections: ConnectionHealthRow[] = data?.connections ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 25))

  const degradedCount = connections.filter((c) => c.status === "degraded" || c.status === "error").length

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wifi size={18} className="text-gray-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Connection Health</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {total > 0 ? `${total.toLocaleString()} connections` : isLoading ? "Loading…" : "No connections"}
              {degradedCount > 0 && (
                <span className="ml-2 text-amber-600 font-medium">· {degradedCount} degraded</span>
              )}
            </p>
          </div>
        </div>
        {isFetching && <Loader2 size={14} className="animate-spin text-gray-400" />}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="degraded">Degraded</option>
          <option value="inactive">Inactive</option>
          <option value="error">Error</option>
        </select>
        <select
          value={dbTypeFilter}
          onChange={(e) => { setDbTypeFilter(e.target.value); setPage(1) }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        >
          <option value="">All DB types</option>
          <option value="postgresql">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="mssql">SQL Server</option>
          <option value="bigquery">BigQuery</option>
          <option value="snowflake">Snowflake</option>
          <option value="redshift">Redshift</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Tenant", "Connection", "DB Type", "Status", "Last Tested", "Last Success", "Failures", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : connections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                    No connections found.
                  </td>
                </tr>
              ) : connections.map((c) => {
                const StatusIcon = STATUS_ICON[c.status] ?? AlertTriangle
                const feedback = actionFeedback[c.id]
                const isDegraded = c.status === "degraded" || c.status === "error"

                return (
                  <tr
                    key={c.id}
                    className={cn(
                      "hover:bg-gray-50 transition-colors",
                      isDegraded && "bg-amber-50/20"
                    )}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 max-w-[140px] truncate">
                      {c.tenant_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">
                      {c.connection_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
                        DB_TYPE_COLOR[c.db_type.toLowerCase()] ?? "bg-gray-50 text-gray-600 border-gray-200"
                      )}>
                        {c.db_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                        STATUS_COLOR[c.status] ?? "bg-gray-50 text-gray-500 border-gray-200"
                      )}>
                        <StatusIcon size={9} />
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {c.last_tested_at
                        ? formatDistanceToNow(new Date(c.last_tested_at), { addSuffix: true })
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {c.last_success_at
                        ? formatDistanceToNow(new Date(c.last_success_at), { addSuffix: true })
                        : <span className="text-red-400">Never</span>}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums">
                      {c.consecutive_failures > 0
                        ? <span className="text-red-600 font-medium">{c.consecutive_failures}</span>
                        : <span className="text-gray-400">0</span>}
                    </td>
                    <td className="px-4 py-3">
                      {feedback ? (
                        <span className="text-xs text-green-600 font-medium">{feedback}</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {isDegraded && (
                            <button
                              onClick={() => retestMutation.mutate(c.id)}
                              disabled={retestMutation.isPending && retestMutation.variables === c.id}
                              className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors disabled:opacity-50"
                            >
                              {retestMutation.isPending && retestMutation.variables === c.id
                                ? <Loader2 size={10} className="animate-spin" />
                                : <RefreshCw size={10} />}
                              Retest
                            </button>
                          )}
                          <button
                            onClick={() => notifyMutation.mutate(c.id)}
                            disabled={notifyMutation.isPending && notifyMutation.variables === c.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            {notifyMutation.isPending && notifyMutation.variables === c.id
                              ? <Loader2 size={10} className="animate-spin" />
                              : <Mail size={10} />}
                            Notify
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && total > 25 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Previous</button>
              <span className="px-3 py-1 text-xs text-gray-500">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Email template note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Notify tenant — email template</p>
        <p className="text-sm text-blue-700 italic">
          "We noticed your database connection [name] is having trouble. Here are some common causes: firewall rules blocking the connection, credential rotation, IP allowlisting. Please check your connection settings or contact support."
        </p>
      </div>
    </div>
  )
}
