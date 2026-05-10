"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow, format, subDays } from "date-fns"
import { Download, ChevronDown, ChevronRight, Search, FileText as SearchIcon } from "lucide-react"
import { auditLog as auditApi, connections as connectionsApi } from "@/lib/api"
import { useAppStore } from "@/store/appStore"
import { cn } from "@/lib/cn"
import EmptyState from "@/components/ui/EmptyState"
import Spinner from "@/components/ui/Spinner"
import type { AuditEvent, Connection } from "@/types"

const EVENT_GROUP: Record<string, string> = {
  "query.executed": "queries",
  "query.unsafe_blocked": "queries",
  "query.correction_detected": "queries",
  "connection.created": "connections",
  "connection.tested": "connections",
  "connection.health_check": "connections",
  "connection.degraded": "connections",
  "connection.recovered": "connections",
  "connection.schema_changed": "connections",
  "connection.schema_acknowledged": "connections",
  "connection.deleted": "connections",
  "context.inferred": "context",
  "context.correction_applied": "context",
  "context.refreshed": "context",
}

const DOT_CLASS: Record<string, string> = {
  queries: "bg-blue-500",
  connections: "bg-green-500",
  context: "bg-purple-500",
}

const DOT_DEGRADED = new Set(["connection.degraded", "connection.deleted", "query.unsafe_blocked"])

function eventDot(e: AuditEvent): string {
  if (DOT_DEGRADED.has(e.event_type)) return "bg-danger"
  return DOT_CLASS[EVENT_GROUP[e.event_type] ?? ""] ?? "bg-[var(--text-muted)]"
}

function describe(e: AuditEvent): string {
  const m = e.metadata ?? {}
  const conn = e.connection_name || "connection"
  switch (e.event_type) {
    case "connection.created": return `Connected ${conn}`
    case "connection.tested": return `Connection test ${m.success ? "succeeded" : "failed"} — ${conn}`
    case "connection.health_check": return `Health check: ${m.status} (${m.response_ms ?? "?"}ms)`
    case "connection.degraded": return `Connection ${conn} became unreachable`
    case "connection.recovered": return `Connection ${conn} recovered`
    case "connection.schema_changed": return `Schema changed — ${m.summary ?? ""}`
    case "connection.schema_acknowledged": return `Schema change acknowledged`
    case "connection.deleted": return `Connection ${conn} deleted`
    case "context.inferred": return `Context updated — ${m.metrics_detected ?? 0} metrics detected`
    case "context.correction_applied": return `Corrected: ${m.original_term ?? "?"} → ${m.corrected_meaning ?? "?"}`
    case "context.refreshed": return `Context refreshed for ${conn}`
    case "query.executed": return `Asked: ${m.prompt_excerpt ?? ""} — ${m.status ?? ""}`
    case "query.unsafe_blocked": return `Blocked: write operation attempted`
    case "query.correction_detected": return `Correction detected`
    default: return e.event_type
  }
}

const FILTER_CHIPS = [
  { label: "All", value: "" },
  { label: "Queries", value: "query.executed,query.unsafe_blocked,query.correction_detected" },
  { label: "Connections", value: "connection.created,connection.tested,connection.health_check,connection.degraded,connection.recovered,connection.schema_changed,connection.schema_acknowledged,connection.deleted" },
  { label: "Context", value: "context.inferred,context.correction_applied,context.refreshed" },
]

function EventRow({ event }: { event: AuditEvent }) {
  const [expanded, setExpanded] = useState(false)
  const dot = eventDot(event)

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors text-left"
      >
        <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
        <span className="flex-1 text-sm text-[var(--text)] min-w-0 truncate">{describe(event)}</span>
        <span
          className="text-xs text-[var(--text-muted)] shrink-0 whitespace-nowrap"
          title={format(new Date(event.created_at), "PPpp")}
        >
          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
        </span>
        {expanded ? <ChevronDown size={13} className="shrink-0 text-[var(--text-muted)]" /> : <ChevronRight size={13} className="shrink-0 text-[var(--text-muted)]" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 ml-5 border-l-2 border-[var(--border)]">
          <div className="flex flex-col gap-1 text-xs text-[var(--text-dim)]">
            <p><span className="font-medium text-[var(--text-muted)]">Event:</span> <span className="font-mono">{event.event_type}</span></p>
            {event.connection_name && <p><span className="font-medium text-[var(--text-muted)]">Connection:</span> {event.connection_name}</p>}
            <p><span className="font-medium text-[var(--text-muted)]">Time:</span> {format(new Date(event.created_at), "PPpp")}</p>
            {Object.keys(event.metadata ?? {}).length > 0 && (
              <div className="mt-1.5">
                <p className="font-medium text-[var(--text-muted)] mb-1">Details:</p>
                <pre className="rounded bg-[var(--surface-3)] px-3 py-2 text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuditLogPage() {
  const { activeConnectionId } = useAppStore()
  const [connectionFilter, setConnectionFilter] = useState<string>("")
  const [typeFilter, setTypeFilter] = useState<string>("")
  const [fromDate] = useState(() => subDays(new Date(), 30).toISOString())

  const { data: allConnections } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list() as Promise<Connection[]>,
    staleTime: 30_000,
  })

  const effectiveConn = connectionFilter || activeConnectionId || undefined

  const { data: events, isLoading } = useQuery<AuditEvent[]>({
    queryKey: ["audit-log", effectiveConn, typeFilter, fromDate],
    queryFn: () => auditApi.list({ connection_id: effectiveConn, event_type: typeFilter || undefined, from_date: fromDate, limit: 200 }) as Promise<AuditEvent[]>,
    staleTime: 30_000,
  })

  const exportUrl = useMemo(
    () => auditApi.exportUrl({ connection_id: effectiveConn, event_type: typeFilter || undefined, from_date: fromDate }),
    [effectiveConn, typeFilter, fromDate]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Activity Log</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Last 30 days of system and user activity</p>
        </div>
        <a
          href={exportUrl}
          download
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-white text-[var(--text-dim)] hover:border-brand/40 hover:text-brand hover:bg-[var(--brand-light)] transition-colors"
        >
          <Download size={12} />
          Export CSV
        </a>
      </div>

      <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border)] shrink-0 flex-wrap">
        <select
          value={connectionFilter}
          onChange={(e) => setConnectionFilter(e.target.value)}
          className="h-8 px-2 pr-7 rounded border border-[var(--border)] bg-white text-xs text-[var(--text)] outline-none focus:border-brand appearance-none"
        >
          <option value="">All connections</option>
          {allConnections?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className="flex items-center gap-1 flex-wrap">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => setTypeFilter(chip.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                typeFilter === chip.value
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-[var(--text-dim)] border-[var(--border)] hover:border-brand/40 hover:text-brand"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : !events?.length ? (
          <EmptyState
            icon={SearchIcon}
            heading="No activity yet"
            body="Activity appears here as you use Querify."
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {events.map((e) => <EventRow key={e.id} event={e} />)}
          </div>
        )}
      </div>
    </div>
  )
}
