"use client"

import Link from "next/link"
import { Database, MessageSquarePlus, Settings as SettingsIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import Badge from "@/components/ui/Badge"
import { formatDistanceToNow } from "date-fns"
import type { Connection, ConnectionStatus } from "@/types"

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
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
          <Badge variant={cfg.badge}>{connection.status}</Badge>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <Badge variant="default">{connection.db_type}</Badge>
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
