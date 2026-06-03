"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { formatDistanceToNow, format } from "date-fns"
import { AlertCircle, ChevronDown, ChevronUp, Loader2, BookmarkCheck, FlaskConical } from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { FailedQuery } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("querify-auth")
    if (!raw) return null
    return (JSON.parse(raw) as { state?: { accessToken?: string } }).state?.accessToken ?? null
  } catch { return null }
}

async function markKnownIssue(id: string): Promise<void> {
  const token = getToken()
  await fetch(`${BASE}/api/v1/admin/queries/${id}/known-issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

async function addToEval(id: string): Promise<void> {
  const token = getToken()
  await fetch(`${BASE}/api/v1/admin/queries/${id}/eval`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

const ERROR_COLORS: Record<string, string> = {
  sql_error: "bg-red-50 text-red-600 border-red-200",
  timeout: "bg-amber-50 text-amber-700 border-amber-200",
  unsafe: "bg-orange-50 text-orange-700 border-orange-200",
  schema_error: "bg-purple-50 text-purple-700 border-purple-200",
  llm_error: "bg-pink-50 text-pink-700 border-pink-200",
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FailedQueriesPage() {
  const [filterErrorType, setFilterErrorType] = useState("")
  const [filterTenant, setFilterTenant] = useState("")
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({})

  const params = new URLSearchParams()
  if (filterErrorType) params.set("error_type", filterErrorType)
  if (filterTenant) params.set("tenant", filterTenant)
  params.set("page", String(page))
  params.set("page_size", "25")

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-failed-queries", filterErrorType, filterTenant, page],
    queryFn: () => adminApi.failedQueries(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  const queries: FailedQuery[] = data?.queries ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 25))

  const knownIssueMutation = useMutation({
    mutationFn: (id: string) => markKnownIssue(id),
    onSuccess: (_, id) => {
      setActionFeedback((f) => ({ ...f, [id]: "Marked as known issue" }))
    },
  })

  const evalMutation = useMutation({
    mutationFn: (id: string) => addToEval(id),
    onSuccess: (_, id) => {
      setActionFeedback((f) => ({ ...f, [id]: "Added to eval harness" }))
    },
  })

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AlertCircle size={18} className="text-red-400" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Failed Queries</h1>
          <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
            {isFetching && <Loader2 size={12} className="animate-spin" />}
            {total > 0 ? `${total.toLocaleString()} failures` : isLoading ? "Loading…" : "No failures"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterErrorType}
          onChange={(e) => { setFilterErrorType(e.target.value); setPage(1) }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        >
          <option value="">All error types</option>
          <option value="sql_error">SQL error</option>
          <option value="timeout">Timeout</option>
          <option value="unsafe">Unsafe</option>
          <option value="schema_error">Schema error</option>
          <option value="llm_error">LLM error</option>
        </select>
        <input
          type="text"
          placeholder="Filter by tenant…"
          value={filterTenant}
          onChange={(e) => { setFilterTenant(e.target.value); setPage(1) }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 w-48"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Tenant", "Prompt", "Error type", "Time", ""].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-t border-gray-50">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-24" /></td>
                  ))}
                </tr>
              ))
            ) : queries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle size={24} className="text-gray-300" />
                    <p className="text-sm text-gray-400">No failed queries. Great!</p>
                  </div>
                </td>
              </tr>
            ) : queries.map((q) => (
              <>
                <tr
                  key={q.id}
                  className="border-t border-gray-50 hover:bg-red-50/30 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 max-w-[140px] truncate">{q.tenant_name}</td>
                  <td className="px-4 py-3 max-w-[280px]">
                    <p className="text-gray-600 truncate">{q.prompt}</p>
                  </td>
                  <td className="px-4 py-3">
                    {q.error_type ? (
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
                        ERROR_COLORS[q.error_type] ?? "bg-red-50 text-red-600 border-red-200"
                      )}>{q.error_type}</span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    {expandedId === q.id
                      ? <ChevronUp size={14} className="text-gray-400" />
                      : <ChevronDown size={14} className="text-gray-400" />}
                  </td>
                </tr>
                {expandedId === q.id && (
                  <tr key={`${q.id}-exp`} className="border-t border-gray-100 bg-gray-50/60">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="flex flex-col gap-4 max-w-3xl">
                        {/* Original prompt */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Original prompt</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-200">{q.prompt_full}</p>
                        </div>
                        {/* Error */}
                        <div>
                          <p className="text-xs font-semibold text-red-500 uppercase mb-1">
                            Error type: {q.error_type ?? "unknown"}
                          </p>
                          {q.error_message && (
                            <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3 border border-red-200 font-mono">{q.error_message}</p>
                          )}
                        </div>
                        {/* SQL */}
                        {q.sql && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Generated SQL</p>
                            <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto">{q.sql}</pre>
                          </div>
                        )}
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {actionFeedback[q.id] ? (
                            <span className="text-xs text-green-600 font-medium">{actionFeedback[q.id]}</span>
                          ) : (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); knownIssueMutation.mutate(q.id) }}
                                disabled={knownIssueMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                              >
                                {knownIssueMutation.isPending && knownIssueMutation.variables === q.id
                                  ? <Loader2 size={11} className="animate-spin" />
                                  : <BookmarkCheck size={12} />}
                                Mark as known issue
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); evalMutation.mutate(q.id) }}
                                disabled={evalMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors disabled:opacity-50"
                              >
                                {evalMutation.isPending && evalMutation.variables === q.id
                                  ? <Loader2 size={11} className="animate-spin" />
                                  : <FlaskConical size={12} />}
                                Add to eval harness
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {!isLoading && total > 25 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-xs text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
