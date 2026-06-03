"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow, format } from "date-fns"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts"
import {
  Briefcase, Loader2, RefreshCw, CheckCircle2,
  XCircle, Clock, AlertTriangle,
} from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { JobStats, JobRow, JobDurationPoint } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

type JobTypeFilter = "" | "schema_introspect" | "context_infer" | "insight_generate" | "export_render"

const JOB_TYPES: { value: JobTypeFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "schema_introspect", label: "Schema introspect" },
  { value: "context_infer", label: "Context infer" },
  { value: "insight_generate", label: "Insight generate" },
  { value: "export_render", label: "Export render" },
]

const JOB_TYPE_COLORS: Record<string, string> = {
  schema_introspect: "#7c3aed",
  context_infer: "#3b82f6",
  insight_generate: "#10b981",
  export_render: "#f59e0b",
}

const STATUS_COLOR: Record<string, string> = {
  queued: "bg-gray-50 text-gray-600 border-gray-200",
  running: "bg-blue-50 text-blue-700 border-blue-200",
  succeeded: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-600 border-red-200",
  retrying: "bg-amber-50 text-amber-700 border-amber-200",
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-100", className)} />
}

function fmtDuration(ms: number | null) {
  if (ms == null) return "—"
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function StatCard({
  label, value, icon: Icon, valueClass,
}: { label: string; value: number; icon: React.ElementType; valueClass?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
          <Icon size={14} className="text-gray-400" />
        </div>
      </div>
      <p className={cn("text-2xl font-bold tabular-nums", valueClass ?? "text-gray-900")}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const qc = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<JobTypeFilter>("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [retryFeedback, setRetryFeedback] = useState<Record<string, boolean>>({})

  const params = new URLSearchParams()
  if (typeFilter) params.set("type", typeFilter)
  if (statusFilter) params.set("status", statusFilter)
  params.set("page", String(page))
  params.set("page_size", "25")

  const { data: stats, isLoading: statsLoading } = useQuery<JobStats>({
    queryKey: ["admin-job-stats", typeFilter],
    queryFn: () => adminApi.jobStats(typeFilter || undefined),
    refetchInterval: 30_000,
    staleTime: 25_000,
  })

  const { data: jobsData, isLoading: jobsLoading, isFetching } = useQuery({
    queryKey: ["admin-jobs", typeFilter, statusFilter, page],
    queryFn: () => adminApi.jobs(params),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  })

  const { data: durationData, isLoading: durationLoading } = useQuery<JobDurationPoint[]>({
    queryKey: ["admin-job-duration-trend"],
    queryFn: adminApi.jobDurationTrend,
    staleTime: 5 * 60_000,
  })

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => adminApi.retryJob(jobId),
    onSuccess: (_, jobId) => {
      setRetryFeedback((f) => ({ ...f, [jobId]: true }))
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["admin-jobs"] })
        qc.invalidateQueries({ queryKey: ["admin-job-stats"] })
      }, 1000)
    },
  })

  const jobs: JobRow[] = jobsData?.jobs ?? []
  const total = jobsData?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 25))

  // Pivot duration data for recharts — one series per job type
  const durationChartData = (() => {
    if (!durationData) return []
    const byDay = new Map<string, Record<string, number>>()
    for (const pt of durationData) {
      if (!byDay.has(pt.day)) byDay.set(pt.day, {})
      byDay.get(pt.day)![pt.type] = Math.round(pt.avg_duration_ms)
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, vals]) => {
        const d = new Date(day)
        return { day: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`, ...vals }
      })
  })()

  const activeJobTypes = durationData
    ? [...new Set(durationData.map((d) => d.type))]
    : []

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Briefcase size={18} className="text-gray-400" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Background Jobs</h1>
          <p className="text-sm text-gray-400 mt-0.5">Celery task queue status and history</p>
        </div>
      </div>

      {/* Job type filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {JOB_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTypeFilter(t.value); setPage(1) }}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg font-medium border transition-colors",
              typeFilter === t.value
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard label="Queued" value={stats?.queued ?? 0} icon={Clock} />
            <StatCard label="Running" value={stats?.running ?? 0} icon={Loader2} valueClass="text-blue-600" />
            <StatCard label="Succeeded today" value={stats?.succeeded_today ?? 0} icon={CheckCircle2} valueClass="text-green-600" />
            <StatCard label="Failed today" value={stats?.failed_today ?? 0} icon={XCircle} valueClass={stats?.failed_today ? "text-red-600" : "text-gray-900"} />
          </>
        )}
      </div>

      {/* Duration trend chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Avg job duration by type — last 7 days</p>
        {durationLoading ? (
          <Skeleton className="h-48" />
        ) : durationChartData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={durationChartData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}s`} />
              <Tooltip
                formatter={(v, name) => [`${(Number(v) / 1000).toFixed(2)} s`, String(name)]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {activeJobTypes.map((t) => (
                <Bar key={t} dataKey={t} fill={JOB_TYPE_COLORS[t] ?? "#6b7280"} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        >
          <option value="">All statuses</option>
          <option value="queued">Queued</option>
          <option value="running">Running</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
        </select>
        {isFetching && <Loader2 size={14} className="animate-spin text-gray-400" />}
      </div>

      {/* Jobs table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Job ID", "Type", "Tenant", "Status", "Started", "Duration", "Retries", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jobsLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    ))}
                  </tr>
                ))
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">No jobs found.</td>
                </tr>
              ) : jobs.map((job) => (
                <tr key={job.job_id} className={cn(
                  "hover:bg-gray-50 transition-colors",
                  job.status === "failed" && "bg-red-50/30"
                )}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[120px] truncate">
                    {job.job_id.slice(0, 16)}…
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border"
                      style={{
                        backgroundColor: `${JOB_TYPE_COLORS[job.type] ?? "#6b7280"}15`,
                        color: JOB_TYPE_COLORS[job.type] ?? "#6b7280",
                        borderColor: `${JOB_TYPE_COLORS[job.type] ?? "#6b7280"}30`,
                      }}
                    >{job.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{job.tenant_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
                      STATUS_COLOR[job.status] ?? "bg-gray-50 text-gray-500 border-gray-200"
                    )}>{job.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {job.started_at
                      ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 tabular-nums">
                    {fmtDuration(job.duration_ms)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 tabular-nums">
                    {job.retry_count > 0
                      ? <span className="text-amber-600 font-medium">{job.retry_count}</span>
                      : "0"}
                  </td>
                  <td className="px-4 py-3">
                    {job.status === "failed" && (
                      retryFeedback[job.job_id] ? (
                        <span className="text-xs text-green-600 font-medium">Queued</span>
                      ) : (
                        <button
                          onClick={() => retryMutation.mutate(job.job_id)}
                          disabled={retryMutation.isPending && retryMutation.variables === job.job_id}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors disabled:opacity-50"
                        >
                          {retryMutation.isPending && retryMutation.variables === job.job_id
                            ? <Loader2 size={10} className="animate-spin" />
                            : <RefreshCw size={10} />}
                          Retry
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!jobsLoading && total > 25 && (
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
    </div>
  )
}
