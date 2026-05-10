"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Database, MessageSquarePlus, Settings as SettingsIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import Badge from "@/components/ui/Badge"
import { DbTypeBadge } from "@/components/connections/DbTypeBadge"
import { formatDistanceToNow } from "date-fns"
import { connections as connectionsApi, confidenceAnalytics } from "@/lib/api"
import type { Connection, ConnectionStatus, HealthSummary, ConfidenceTrend } from "@/types"

interface ConnectionCardProps {
  connection: Connection
  className?: string
}

const statusConfig: Record<ConnectionStatus, { dot: string; badge: "active" | "degraded" | "inactive" | "pending" }> = {
  active: { dot: "bg-success", badge: "active" },
  error: { dot: "bg-danger", badge: "degraded" },
  pending: { dot: "bg-brand-mid", badge: "pending" },
  untested: { dot: "bg-[var(--text-muted)]", badge: "inactive" },
}

function reliabilityDot(color: "green" | "amber" | "red" | "grey") {
  return { green: "bg-success", amber: "bg-amber-400", red: "bg-danger", grey: "bg-[var(--border)]" }[color]
}

function healthDotColor(summary: HealthSummary | undefined, status: ConnectionStatus): "green" | "amber" | "red" | "grey" {
  if (!summary) return status === "active" ? "green" : status === "error" ? "red" : "grey"
  if (summary.uptime_pct >= 99) return "green"
  if (summary.uptime_pct >= 90) return "amber"
  return "red"
}

function schemaDotColor(conn: Connection): "green" | "amber" | "red" | "grey" {
  if (!conn.last_introspected_at) return "grey"
  const days = Math.floor((Date.now() - new Date(conn.last_introspected_at).getTime()) / 86_400_000)
  if (conn.pending_schema_diff) return "amber"
  if (days < 7) return "green"
  if (days <= 30) return "amber"
  return "red"
}

function accuracyDotColor(trend: ConfidenceTrend | undefined): "green" | "amber" | "red" | "grey" {
  if (!trend?.overall_avg) return "grey"
  if (trend.overall_avg >= 80) return "green"
  if (trend.overall_avg >= 60) return "amber"
  return "red"
}

function ReliabilityDots({ connection }: { connection: Connection }) {
  const isNew = !connection.last_tested_at

  const { data: summary } = useQuery<HealthSummary>({
    queryKey: ["health-summary", connection.id],
    queryFn: () => connectionsApi.healthSummary(connection.id) as Promise<HealthSummary>,
    staleTime: 5 * 60_000,
    enabled: !isNew,
  })

  const { data: trend } = useQuery<ConfidenceTrend>({
    queryKey: ["confidence-trend", connection.id, 7],
    queryFn: () => confidenceAnalytics.trend(connection.id, 7) as Promise<ConfidenceTrend>,
    staleTime: 5 * 60_000,
    enabled: !isNew,
  })

  if (isNew) return null

  const hDot = healthDotColor(summary, connection.status)
  const sDot = schemaDotColor(connection)
  const aDot = accuracyDotColor(trend)

  const hLabel = hDot === "green" ? "Connection healthy" : hDot === "amber" ? "Connection degraded" : hDot === "red" ? "Connection unreachable" : "Health unknown"
  const sLabel = sDot === "green" ? "Schema current" : sDot === "amber" ? "Schema may be outdated" : sDot === "red" ? "Schema is stale" : "Schema unknown"
  const aLabel = trend?.overall_avg ? `Accuracy: ${trend.overall_avg}/100` : "Accuracy data pending"

  return (
    <div
      className="flex items-center gap-1.5 mt-0.5"
      title={`${hLabel} · ${sLabel} · ${aLabel}`}
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0", reliabilityDot(hDot))} />
      <span className={cn("h-2 w-2 rounded-full shrink-0", reliabilityDot(sDot))} />
      <span className={cn("h-2 w-2 rounded-full shrink-0", reliabilityDot(aDot))} />
      <span className="text-[10px] text-[var(--text-muted)]">Reliability</span>
    </div>
  )
}

export const ConnectionCard = ({ connection, className }: ConnectionCardProps) => {
  const cfg = statusConfig[connection.status] || statusConfig.untested
  const testedAgo = connection.last_tested_at ? formatDistanceToNow(new Date(connection.last_tested_at), { addSuffix: true }) : null

  return (
    <div className={cn("rounded-lg border border-[var(--border)] bg-surface-2 p-4 flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded bg-surface-3 border border-[var(--border)]">
            <Database size={14} className="text-[var(--text-muted)]" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[var(--text)] leading-tight">{connection.name}</span>
            <span className="text-xs text-[var(--text-muted)]">{connection.database_name}</span>
            <ReliabilityDots connection={connection} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
          <Badge variant={cfg.badge}>{connection.status}</Badge>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <DbTypeBadge dbType={connection.db_type} />
        {connection.context_version !== null && connection.context_version > 0 && (
          <span>v{connection.context_version} context</span>
        )}
        {testedAgo && <span>Tested {testedAgo}</span>}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]">
        <Link
          href={`/chat/new?connection=${connection.id}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-brand-mid hover:bg-surface-3 transition-colors"
        >
          <MessageSquarePlus size={12} />
          Open chat
        </Link>
        <Link
          href={`/settings/connections/${connection.id}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-[var(--text-muted)] hover:bg-surface-3 transition-colors"
        >
          <SettingsIcon size={12} />
          Settings
        </Link>
      </div>
    </div>
  )
}

export default ConnectionCard
