"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { Activity, ChevronDown, ChevronUp, Eye, EyeOff, Loader2 } from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { QueryFeedRow } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  success: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-600 border-red-200",
  timeout: "bg-amber-50 text-amber-700 border-amber-200",
  unsafe: "bg-orange-50 text-orange-700 border-orange-200",
}

const MODEL_TIER: Record<string, string> = {
  fast: "bg-sky-50 text-sky-700 border-sky-200",
  primary: "bg-violet-50 text-violet-700 border-violet-200",
  complex: "bg-indigo-50 text-indigo-700 border-indigo-200",
}

function modelTier(model: string | null): string {
  if (!model) return "—"
  if (model.includes("mini") || model.includes("haiku") || model.includes("flash")) return "fast"
  if (model.includes("opus") || model.includes("ultra")) return "complex"
  return "primary"
}

function anonymiseTenant(id: string, name: string, anon: boolean): string {
  if (!anon) return name
  const hash = id.slice(-6).toUpperCase()
  return `Tenant-${hash}`
}

function truncate(s: string, len: number): string {
  if (s.length <= len) return s
  return s.slice(0, len) + "…"
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QueryFeedPage() {
  const [anon, setAnon] = useState(false)
  const [filterStatus, setFilterStatus] = useState("")
  const [filterTenant, setFilterTenant] = useState("")
  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const params = new URLSearchParams()
  if (filterStatus) params.set("status", filterStatus)
  if (filterTenant) params.set("tenant", filterTenant)
  if (filterFrom) params.set("from", filterFrom)
  if (filterTo) params.set("to", filterTo)

  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery<QueryFeedRow[]>({
    queryKey: ["admin-query-feed", filterStatus, filterTenant, filterFrom, filterTo],
    queryFn: () => adminApi.queryFeed(params),
    refetchInterval: 10_000,
    staleTime: 9_000,
  })

  const queries = data ?? []

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity size={18} className="text-gray-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Query Feed</h1>
            <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
              {isFetching && <Loader2 size={12} className="animate-spin" />}
              Live · refreshes every 10 s
              {dataUpdatedAt > 0 && (
                <span className="text-gray-300">·</span>
              )}
              {queries.length > 0 && (
                <span>{queries.length} results</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setAnon((a) => !a)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
            anon
              ? "bg-violet-600 text-white border-violet-600"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          )}
        >
          {anon ? <EyeOff size={13} /> : <Eye size={13} />}
          {anon ? "Anonymised" : "Anonymise"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        >
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="timeout">Timeout</option>
          <option value="unsafe">Unsafe</option>
        </select>
        <input
          type="text"
          placeholder="Filter by tenant…"
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 w-48"
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Tenant", "Prompt", "Status", "Model tier", "Exec time", "LLM cost", "Time"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : queries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No queries found.</td>
                </tr>
              ) : queries.map((q) => (
                <>
                  <tr
                    key={q.id}
                    className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 max-w-[140px] truncate">
                      {anonymiseTenant(q.tenant_id, q.tenant_name, anon)}
                    </td>
                    <td className="px-4 py-3 max-w-[280px]">
                      <p className="text-gray-600 truncate">{truncate(q.prompt, 80)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
                        STATUS_COLOR[q.status.toLowerCase()] ?? "bg-gray-50 text-gray-500 border-gray-200"
                      )}>{q.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {q.model_used ? (
                        <span className={cn(
                          "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
                          MODEL_TIER[modelTier(q.model_used)] ?? "bg-gray-50 text-gray-500 border-gray-200"
                        )}>{modelTier(q.model_used)}</span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 tabular-nums">
                      {q.execution_ms != null ? `${q.execution_ms} ms` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 tabular-nums">
                      {q.llm_cost_usd != null ? `$${q.llm_cost_usd.toFixed(5)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                        {expandedId === q.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </span>
                    </td>
                  </tr>
                  {expandedId === q.id && (
                    <tr key={`${q.id}-exp`} className="border-t border-gray-100 bg-gray-50">
                      <td colSpan={7} className="px-4 py-4">
                        <ExpandedQuery id={q.id} tenantName={anonymiseTenant(q.tenant_id, q.tenant_name, anon)} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ExpandedQuery({ id, tenantName }: { id: string; tenantName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-query-detail", id],
    queryFn: () => adminApi.queryDetail(id),
  })

  if (isLoading) {
    return <div className="h-16 bg-gray-100 rounded animate-pulse" />
  }
  if (!data) return null

  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      <p className="text-xs text-gray-400 font-semibold uppercase">Tenant: {tenantName}</p>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Full prompt</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-200">{data.prompt_full}</p>
      </div>
      {data.sql && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Generated SQL</p>
          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto">{data.sql}</pre>
        </div>
      )}
      {data.error_message && (
        <div>
          <p className="text-xs font-semibold text-red-500 uppercase mb-1">Error — {data.error_type}</p>
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-100">{data.error_message}</p>
        </div>
      )}
    </div>
  )
}
