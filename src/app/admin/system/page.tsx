"use client"

import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow, format } from "date-fns"
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from "recharts"
import {
  CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  Server, Loader2, Clock,
} from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { SystemHealthDetail, ComponentDetail, HealthStatus, SystemAlert } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<HealthStatus, string> = {
  healthy: "bg-green-500",
  degraded: "bg-amber-400",
  down: "bg-red-500",
  unknown: "bg-gray-400",
}
const STATUS_RING: Record<HealthStatus, string> = {
  healthy: "border-green-200 bg-green-50",
  degraded: "border-amber-200 bg-amber-50",
  down: "border-red-200 bg-red-50",
  unknown: "border-gray-200 bg-gray-50",
}
const STATUS_LABEL: Record<HealthStatus, string> = {
  healthy: "text-green-700",
  degraded: "text-amber-700",
  down: "text-red-700",
  unknown: "text-gray-500",
}
const STATUS_ICON: Record<HealthStatus, React.ElementType> = {
  healthy: CheckCircle2,
  degraded: AlertTriangle,
  down: XCircle,
  unknown: HelpCircle,
}
const SEVERITY_COLOR: Record<string, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
}
const COMPONENT_LABELS: Record<string, string> = {
  api: "API",
  celery: "Celery",
  redis: "Redis",
  database: "Supabase",
  llm_api: "OpenAI",
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-100", className)} />
}

// ── Component card ────────────────────────────────────────────────────────────

function ComponentCard({ name, data }: { name: string; data: ComponentDetail | undefined }) {
  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <Skeleton className="h-32" />
      </div>
    )
  }

  const status = data.status
  const Icon = STATUS_ICON[status]
  const sparkData = data.sparkline.map((p, i) => ({ i, v: p.v }))

  const sparkColor = status === "healthy" ? "#10b981" : status === "degraded" ? "#f59e0b" : "#ef4444"

  return (
    <div className={cn(
      "bg-white rounded-xl border p-5 flex flex-col gap-4",
      STATUS_RING[status]
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", STATUS_DOT[status])} />
          <div>
            <p className="text-sm font-semibold text-gray-900">{COMPONENT_LABELS[name] ?? name}</p>
            <p className={cn("text-xs font-medium mt-0.5", STATUS_LABEL[status])}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </p>
          </div>
        </div>
        <Icon size={15} className={cn(
          status === "healthy" ? "text-green-500"
          : status === "degraded" ? "text-amber-500"
          : status === "down" ? "text-red-500"
          : "text-gray-400"
        )} />
      </div>

      {/* Key metric */}
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{data.key_metric_label}</p>
        <p className="text-xl font-bold text-gray-900 tabular-nums">
          {data.key_metric_value ?? "—"}
        </p>
      </div>

      {/* Sparkline */}
      {sparkData.length > 1 ? (
        <ResponsiveContainer width="100%" height={48}>
          <LineChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                return (
                  <div className="text-[10px] bg-gray-900 text-white px-2 py-1 rounded">
                    {payload[0].value}
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke={sparkColor}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-12 flex items-center">
          <p className="text-xs text-gray-300">No sparkline data</p>
        </div>
      )}

      {/* Last checked */}
      <p className="text-[11px] text-gray-400 flex items-center gap-1">
        <Clock size={10} />
        {data.last_checked_at
          ? `Checked ${formatDistanceToNow(new Date(data.last_checked_at), { addSuffix: true })}`
          : "Never checked"}
      </p>

      {data.detail && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">{data.detail}</p>
      )}
    </div>
  )
}

// ── Alert row ─────────────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: SystemAlert }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
      <span className={cn(
        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 mt-0.5",
        SEVERITY_COLOR[alert.severity] ?? "bg-gray-50 text-gray-500 border-gray-200"
      )}>
        {alert.severity}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800">
          <span className="font-medium">{COMPONENT_LABELS[alert.component] ?? alert.component}</span>
          {" — "}
          {alert.message}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Fired {format(new Date(alert.fired_at), "MMM d, HH:mm")}
          {alert.resolved_at
            ? ` · Resolved ${formatDistanceToNow(new Date(alert.resolved_at), { addSuffix: true })}`
            : (
              <span className="ml-1 text-amber-600 font-medium">· Active</span>
            )}
        </p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SystemPage() {
  const { data: health, isLoading: healthLoading, dataUpdatedAt } = useQuery<SystemHealthDetail>({
    queryKey: ["admin-system-health"],
    queryFn: adminApi.systemHealth,
    refetchInterval: 2 * 60_000,
    staleTime: 90_000,
  })

  const { data: alerts, isLoading: alertsLoading } = useQuery<SystemAlert[]>({
    queryKey: ["admin-system-alerts"],
    queryFn: adminApi.systemAlerts,
    refetchInterval: 2 * 60_000,
    staleTime: 90_000,
  })

  const COMPONENT_KEYS = ["api", "celery", "redis", "database", "llm_api"] as const

  const overallStatus: HealthStatus = (() => {
    if (!health) return "unknown"
    const statuses = COMPONENT_KEYS.map((k) => health[k]?.status ?? "unknown")
    if (statuses.includes("down")) return "down"
    if (statuses.includes("degraded")) return "degraded"
    if (statuses.every((s) => s === "healthy")) return "healthy"
    return "unknown"
  })()

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Server size={18} className="text-gray-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Infrastructure Status</h1>
            <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin opacity-40" />
              Auto-refreshes every 2 min
              {dataUpdatedAt > 0 && (
                <span className="text-gray-300 ml-1">
                  · Last: {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
                </span>
              )}
            </p>
          </div>
        </div>
        {/* Overall status pill */}
        {!healthLoading && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border",
            STATUS_RING[overallStatus]
          )}>
            <span className={cn("w-2 h-2 rounded-full", STATUS_DOT[overallStatus])} />
            <span className={STATUS_LABEL[overallStatus]}>
              {overallStatus === "healthy" ? "All systems operational"
                : overallStatus === "degraded" ? "Partial degradation"
                : overallStatus === "down" ? "Outage detected"
                : "Status unknown"}
            </span>
          </div>
        )}
      </div>

      {/* Component grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {COMPONENT_KEYS.map((key) => (
          <ComponentCard
            key={key}
            name={key}
            data={healthLoading ? undefined : health?.[key]}
          />
        ))}
      </div>

      {/* Alert history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Alert history</p>
          <p className="text-xs text-gray-400">Last 20 alerts</p>
        </div>
        {alertsLoading ? (
          <div className="p-5 flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (alerts ?? []).length === 0 ? (
          <div className="px-5 py-12 flex flex-col items-center gap-2">
            <CheckCircle2 size={24} className="text-green-400" />
            <p className="text-sm text-gray-400">No alerts in history.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {(alerts ?? []).slice(0, 20).map((a) => (
              <li key={a.id}>
                <AlertRow alert={a} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
