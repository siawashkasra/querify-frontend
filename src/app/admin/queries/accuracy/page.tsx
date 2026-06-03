"use client"

import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow, format } from "date-fns"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import {
  BarChart2, TrendingUp, ThumbsUp, RefreshCw, Clock,
} from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { AccuracyReport } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-100", className)} />
}

function fmtDay(iso: string) {
  const d = new Date(iso)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

const ERROR_TYPE_COLORS: Record<string, string> = {
  sql_error: "#ef4444",
  timeout: "#f59e0b",
  unsafe: "#f97316",
  schema_error: "#8b5cf6",
  llm_error: "#ec4899",
}
const DEFAULT_COLOR = "#6b7280"

function rateColor(rate: number) {
  if (rate >= 80) return "text-green-600"
  if (rate >= 60) return "text-amber-500"
  return "text-red-500"
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AccuracyPage() {
  const { data, isLoading } = useQuery<AccuracyReport>({
    queryKey: ["admin-accuracy"],
    queryFn: adminApi.accuracyReport,
    staleTime: 60 * 60 * 1000, // 1 hour — updated daily
  })

  const lastUpdated = data?.generated_at
    ? formatDistanceToNow(new Date(data.generated_at), { addSuffix: true })
    : null

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 size={18} className="text-gray-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Accuracy Report</h1>
            {lastUpdated && (
              <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
                <Clock size={12} />
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Headline KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : data ? (
          <>
            <HeadlineCard
              label="7-day success rate"
              value={`${data.headlines.success_rate_7d.toFixed(1)}%`}
              sub={`${data.headlines.total_queries_7d.toLocaleString()} queries`}
              icon={TrendingUp}
              valueClass={rateColor(data.headlines.success_rate_7d)}
            />
            <HeadlineCard
              label="Thumbs-up rate"
              value={data.headlines.thumbs_up_rate != null
                ? `${data.headlines.thumbs_up_rate.toFixed(1)}%`
                : "N/A"}
              sub="User feedback on results"
              icon={ThumbsUp}
            />
            <HeadlineCard
              label="Correction rate"
              value={`${data.headlines.correction_rate.toFixed(1)}%`}
              sub="Queries that needed correction"
              icon={RefreshCw}
              valueClass={data.headlines.correction_rate > 20 ? "text-red-500" : "text-gray-900"}
            />
          </>
        ) : null}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Error type bar chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Failures by error type</p>
          {isLoading ? (
            <Skeleton className="h-48" />
          ) : (data?.by_error_type ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No failures.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={data!.by_error_type}
                layout="vertical"
                margin={{ top: 0, right: 20, bottom: 0, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="error_type" tick={{ fontSize: 11 }} width={60} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 2, 2, 0]}>
                  {(data!.by_error_type).map((entry) => (
                    <Cell
                      key={entry.error_type}
                      fill={ERROR_TYPE_COLORS[entry.error_type] ?? DEFAULT_COLOR}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Success rate trend line chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Success rate — last 30 days</p>
          {isLoading ? (
            <Skeleton className="h-48" />
          ) : (data?.success_rate_by_day ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={data!.success_rate_by_day}
                margin={{ top: 0, right: 10, bottom: 0, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10 }} interval={4} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  formatter={(v) => [`${v}%`, "Success rate"]}
                  labelFormatter={(l) => fmtDay(String(l))}
                  contentStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Failure patterns table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Most common failure patterns</p>
        </div>
        {isLoading ? (
          <div className="p-5 flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (data?.failure_patterns ?? []).length === 0 ? (
          <p className="px-5 py-10 text-sm text-gray-400 text-center">No failure patterns recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Pattern", "Error type", "Count", "Example prompt"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data!.failure_patterns).map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.pattern}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border"
                      style={{
                        backgroundColor: `${ERROR_TYPE_COLORS[p.error_type] ?? DEFAULT_COLOR}18`,
                        color: ERROR_TYPE_COLORS[p.error_type] ?? DEFAULT_COLOR,
                        borderColor: `${ERROR_TYPE_COLORS[p.error_type] ?? DEFAULT_COLOR}40`,
                      }}
                    >{p.error_type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums font-medium">{p.count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{p.example_prompt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function HeadlineCard({
  label, value, sub, icon: Icon, valueClass,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  valueClass?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
          <Icon size={14} className="text-gray-400" />
        </div>
      </div>
      <p className={cn("text-2xl font-bold tabular-nums", valueClass ?? "text-gray-900")}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
