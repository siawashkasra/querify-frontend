"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  ScrollText, Search, Download, Loader2, Filter,
} from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { AuditLogRow } from "@/lib/adminApi"
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

// Event type highlighting — immutable, so no actions shown
const EVENT_HIGHLIGHT: Record<string, string> = {
  // Impersonation events — orange
  admin_impersonate: "bg-orange-50 border-l-2 border-l-orange-400",
  impersonation_start: "bg-orange-50 border-l-2 border-l-orange-400",
  // Suspension / deletion events — red
  tenant_suspend: "bg-red-50 border-l-2 border-l-red-400",
  tenant_delete: "bg-red-50 border-l-2 border-l-red-400",
  user_delete: "bg-red-50 border-l-2 border-l-red-400",
  connection_delete: "bg-red-50 border-l-2 border-l-red-400",
  data_delete: "bg-red-50 border-l-2 border-l-red-400",
}

const EVENT_BADGE: Record<string, string> = {
  admin_impersonate: "bg-orange-100 text-orange-700 border-orange-200",
  impersonation_start: "bg-orange-100 text-orange-700 border-orange-200",
  tenant_suspend: "bg-red-100 text-red-700 border-red-200",
  tenant_delete: "bg-red-100 text-red-700 border-red-200",
  user_delete: "bg-red-100 text-red-700 border-red-200",
  connection_delete: "bg-red-100 text-red-700 border-red-200",
  data_delete: "bg-red-100 text-red-700 border-red-200",
}

function eventBadgeClass(eventType: string): string {
  // Check prefixes for broader matching
  if (eventType.includes("impersonat")) return EVENT_BADGE["admin_impersonate"]
  if (eventType.includes("suspend") || eventType.includes("delete")) return EVENT_BADGE["tenant_suspend"]
  return "bg-gray-100 text-gray-600 border-gray-200"
}
function rowHighlightClass(eventType: string): string {
  if (eventType.includes("impersonat")) return EVENT_HIGHLIGHT["admin_impersonate"]
  if (eventType.includes("suspend") || eventType.includes("delete")) return EVENT_HIGHLIGHT["tenant_suspend"]
  return ""
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-100", className)} />
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [search, setSearch] = useState("")
  const [filterActor, setFilterActor] = useState("")
  const [filterEventType, setFilterEventType] = useState("")
  const [filterTenant, setFilterTenant] = useState("")
  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)
  const debouncedActor = useDebounce(filterActor, 300)
  const debouncedTenant = useDebounce(filterTenant, 300)

  const params = new URLSearchParams()
  if (debouncedSearch) params.set("search", debouncedSearch)
  if (debouncedActor) params.set("actor", debouncedActor)
  if (filterEventType) params.set("event_type", filterEventType)
  if (debouncedTenant) params.set("tenant", debouncedTenant)
  if (filterFrom) params.set("from", filterFrom)
  if (filterTo) params.set("to", filterTo)
  params.set("page", String(page))
  params.set("page_size", "50")

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "admin-audit-log",
      debouncedSearch, debouncedActor, filterEventType,
      debouncedTenant, filterFrom, filterTo, page,
    ],
    queryFn: () => adminApi.auditLog(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [
    debouncedSearch, debouncedActor, filterEventType,
    debouncedTenant, filterFrom, filterTo,
  ])

  const rows: AuditLogRow[] = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 50))

  function handleExport() {
    const exportParams = new URLSearchParams(params)
    exportParams.delete("page")
    exportParams.delete("page_size")
    const token = (() => {
      try {
        const raw = localStorage.getItem("querify-auth")
        if (!raw) return null
        return (JSON.parse(raw) as { state?: { accessToken?: string } }).state?.accessToken ?? null
      } catch { return null }
    })()
    const url = `${adminApi.auditLogExportUrl()}?${exportParams}${token ? `&token=${token}` : ""}`
    window.open(url, "_blank")
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ScrollText size={18} className="text-gray-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {total > 0 ? `${total.toLocaleString()} events` : isLoading ? "Loading…" : "No events"}
              {" · "}
              <span className="text-gray-300">Immutable — no edit or delete</span>
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Full text search */}
        <div className="relative min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search event type or resource…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by actor…"
          value={filterActor}
          onChange={(e) => setFilterActor(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white w-44 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />
        <select
          value={filterEventType}
          onChange={(e) => setFilterEventType(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        >
          <option value="">All event types</option>
          <option value="admin_impersonate">Impersonation</option>
          <option value="tenant_suspend">Suspension</option>
          <option value="tenant_delete">Tenant delete</option>
          <option value="user_delete">User delete</option>
          <option value="query_replay">Query replay</option>
          <option value="email_send">Email send</option>
          <option value="grace_period">Grace period</option>
          <option value="connection_retest">Connection retest</option>
          <option value="password_reset">Password reset</option>
        </select>
        <input
          type="text"
          placeholder="Filter by tenant…"
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white w-40 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
          <span className="text-gray-400 text-sm">→</span>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
        {isFetching && <Loader2 size={14} className="animate-spin text-gray-400" />}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-orange-200 border border-orange-300" />
          Impersonation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-200 border border-red-300" />
          Suspension / Deletion
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Timestamp", "Event type", "Actor", "Tenant", "Resource", "Details"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-gray-400">
                    No audit events found.
                  </td>
                </tr>
              ) : rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-t border-gray-50 hover:brightness-95 transition-all",
                    rowHighlightClass(row.event_type)
                  )}
                >
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {format(new Date(row.created_at), "MMM d, yyyy HH:mm:ss")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border",
                      eventBadgeClass(row.event_type)
                    )}>
                      {row.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">
                    {row.actor_email ?? <span className="text-gray-300">system</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[140px] truncate">
                    {row.tenant_name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate font-mono">
                    {row.resource ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[220px]">
                    {row.details ? (
                      <pre className="truncate font-mono text-[10px] text-gray-500">
                        {JSON.stringify(row.details)}
                      </pre>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of {total.toLocaleString()}
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
    </div>
  )
}
