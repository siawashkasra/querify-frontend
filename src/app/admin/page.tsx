"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts"
import {
  Users, TrendingUp, Clock, DollarSign,
  CheckCircle2, AlertTriangle, XCircle, Loader2, HelpCircle,
} from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type {
  DashboardKpis, DashboardCharts, DashboardFeeds,
  DashboardHealth, ComponentHealth, HealthStatus,
} from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHour(iso: string) {
  const d = new Date(iso)
  return `${d.getUTCHours().toString().padStart(2, "0")}:00`
}
function fmtDay(iso: string) {
  const d = new Date(iso)
  return `${(d.getUTCMonth() + 1)}/${d.getUTCDate()}`
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, sub, valueClass,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  sub?: string
  valueClass?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
          <Icon size={15} className="text-gray-400" />
        </div>
      </div>
      <p className={cn("text-2xl font-bold text-gray-900 tabular-nums", valueClass)}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function successRateColor(rate: number) {
  if (rate >= 80) return "text-green-600"
  if (rate >= 60) return "text-amber-500"
  return "text-red-500"
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">{title}</h2>
  )
}

// ── Health pill ───────────────────────────────────────────────────────────────

const STATUS_ICON: Record<HealthStatus, React.ElementType> = {
  healthy: CheckCircle2,
  degraded: AlertTriangle,
  down: XCircle,
  unknown: HelpCircle,
}
const STATUS_COLOR: Record<HealthStatus, string> = {
  healthy: "bg-green-50 text-green-700 border-green-200",
  degraded: "bg-amber-50 text-amber-700 border-amber-200",
  down: "bg-red-50 text-red-600 border-red-200",
  unknown: "bg-gray-50 text-gray-500 border-gray-200",
}

function HealthPill({
  label, data,
}: { label: string; data: ComponentHealth | undefined }) {
  const status: HealthStatus = data?.status ?? "unknown"
  const Icon = STATUS_ICON[status]
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium",
      STATUS_COLOR[status]
    )}>
      <Icon size={13} className="flex-shrink-0" />
      <span>{label}</span>
      {data?.error_rate_pct !== undefined && (
        <span className="opacity-60">{data.error_rate_pct}% err</span>
      )}
      {data?.avg_response_ms !== undefined && (
        <span className="opacity-60">{data.avg_response_ms}ms</span>
      )}
      {data?.queued !== undefined && (
        <span className="opacity-60">{data.queued} queued</span>
      )}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-100", className)} />
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data: kpis, isLoading: kpisLoading } = useQuery<DashboardKpis>({
    queryKey: ["admin-kpis"],
    queryFn: adminApi.kpis,
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  })

  const { data: charts, isLoading: chartsLoading } = useQuery<DashboardCharts>({
    queryKey: ["admin-charts"],
    queryFn: adminApi.charts,
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  })

  const { data: feeds, isLoading: feedsLoading } = useQuery<DashboardFeeds>({
    queryKey: ["admin-feeds"],
    queryFn: adminApi.feeds,
    refetchInterval: 30_000,
    staleTime: 25_000,
  })

  const { data: health, isLoading: healthLoading } = useQuery<DashboardHealth>({
    queryKey: ["admin-health"],
    queryFn: adminApi.health,
    refetchInterval: 30_000,
    staleTime: 25_000,
  })

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Real-time overview of the Querify platform</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Loader2 size={12} className="animate-spin opacity-40" />
          Auto-refreshes every 5 min
        </div>
      </div>

      {/* ── Row 1: KPI cards ───────────────────────────────────────────────── */}
      <section>
        <SectionHeading title="Key metrics" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpisLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
          ) : (
            <>
              <KpiCard
                label="Active tenants this week"
                value={kpis?.active_tenants_week ?? 0}
                icon={Users}
                sub="Tenants with at least one query"
              />
              <KpiCard
                label="Query success rate today"
                value={`${kpis?.query_success_rate_today ?? 0}%`}
                icon={TrendingUp}
                sub="assistant messages with status=success"
                valueClass={successRateColor(kpis?.query_success_rate_today ?? 0)}
              />
              <KpiCard
                label="Avg query latency today"
                value={`${kpis?.avg_latency_ms_today ?? 0} ms`}
                icon={Clock}
                sub="Successful queries only"
              />
              <KpiCard
                label="LLM cost today"
                value={`$${(kpis?.llm_cost_usd_today ?? 0).toFixed(4)}`}
                icon={DollarSign}
                sub="OpenAI token costs"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Row 2: Charts ─────────────────────────────────────────────────── */}
      <section>
        <SectionHeading title="Trends" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Query volume by hour */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Query volume — last 24 h</p>
            {chartsLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={charts?.query_volume_by_hour ?? []} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tickFormatter={fmtHour} tick={{ fontSize: 10 }} interval={3} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v) => [`${v} queries`, "Volume"]}
                    labelFormatter={(l) => fmtHour(String(l))}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#7c3aed" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Success rate by day */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Success rate — last 7 days</p>
            {chartsLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={charts?.success_rate_by_day ?? []} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10 }} />
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
                    dot={{ r: 3, fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* New signups by day */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">New signups — last 30 days</p>
            {chartsLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={charts?.signups_by_day ?? []} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v) => [`${v} signups`, "Signups"]}
                    labelFormatter={(l) => fmtDay(String(l))}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* ── Row 3: Live feeds ──────────────────────────────────────────────── */}
      <section>
        <SectionHeading title="Live feeds  ·  refreshes every 30 s" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Recent signups */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Recent signups</p>
            </div>
            {feedsLoading ? (
              <div className="p-5 flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (feeds?.recent_signups?.length ?? 0) === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">No signups yet.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {(feeds?.recent_signups ?? []).map((t) => (
                  <li key={t.tenant_id} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{t.tenant_name}</p>
                      <p className="text-xs text-gray-400">
                        <span className={cn(
                          "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5",
                          t.plan_name === "free"
                            ? "bg-gray-100 text-gray-500"
                            : t.plan_name === "starter"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-violet-50 text-violet-600"
                        )}>
                          {t.plan_name}
                        </span>
                        {t.first_query_at ? "First query: " + formatDistanceToNow(new Date(t.first_query_at), { addSuffix: true }) : "No queries yet"}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-3">
                      {formatDistanceToNow(new Date(t.signed_up_at), { addSuffix: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent failures */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Recent failures</p>
            </div>
            {feedsLoading ? (
              <div className="p-5 flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (feeds?.recent_failures?.length ?? 0) === 0 ? (
              <p className="px-5 py-8 text-sm text-green-600 text-center">No failures. 🎉</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {(feeds?.recent_failures ?? []).map((f) => (
                  <li key={f.message_id} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{f.tenant_name}</p>
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600">
                        {f.error_type}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-3">
                      {formatDistanceToNow(new Date(f.failed_at), { addSuffix: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ── Row 4: System health strip ─────────────────────────────────────── */}
      <section>
        <SectionHeading title="System health" />
        <Link
          href="/admin/system"
          className="flex flex-wrap items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors group"
        >
          {healthLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-28" />)
          ) : (
            <>
              <HealthPill label="API" data={health?.api} />
              <HealthPill label="LLM API" data={health?.llm_api} />
              <HealthPill label="Celery" data={health?.celery} />
              <HealthPill label="Redis" data={health?.redis} />
              <HealthPill label="Database" data={health?.database} />
            </>
          )}
          <span className="ml-auto text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
            View system details →
          </span>
        </Link>
      </section>
    </div>
  )
}
