"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, subDays } from "date-fns"
import { ScrollText, Download, Loader2, Search } from "lucide-react"
import { auditLog as auditApi, connections as connectionsApi } from "@/lib/api"
import Spinner from "@/components/ui/Spinner"
import EmptyState from "@/components/ui/EmptyState"
import { cn } from "@/lib/cn"
import type { AuditEvent, Connection } from "@/types"

// ── Event categories ──────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: "", label: "All events" },
  { value: "connection.created", label: "Connection created" },
  { value: "connection.deleted", label: "Connection deleted" },
  { value: "connection.schema_changed", label: "Schema changed" },
  { value: "connection.health_check", label: "Health check" },
  { value: "connection.degraded", label: "Connection degraded" },
  { value: "connection.recovered", label: "Connection recovered" },
  { value: "member.invited", label: "Member invited" },
  { value: "member.role_changed", label: "Role changed" },
  { value: "member.removed", label: "Member removed" },
  { value: "billing.plan_changed", label: "Plan changed" },
  { value: "billing.cancelled", label: "Billing cancelled" },
]

// Event descriptions
function describeEvent(e: AuditEvent): string {
  const m = e.metadata ?? {}
  const conn = e.connection_name ?? "connection"
  switch (e.event_type) {
    case "connection.created": return `Connected "${conn}"`
    case "connection.deleted": return `Deleted "${conn}"`
    case "connection.tested": return `Tested "${conn}" — ${m.success ? "passed" : "failed"}`
    case "connection.health_check": return `Health check on "${conn}": ${m.status} (${m.response_ms ?? "?"}ms)`
    case "connection.degraded": return `"${conn}" is degraded`
    case "connection.recovered": return `"${conn}" recovered`
    case "connection.schema_changed": return `Schema change detected on "${conn}"`
    case "connection.schema_acknowledged": return `Schema change acknowledged on "${conn}"`
    case "context.inferred": return `Context layer inferred for "${conn}"`
    case "context.refreshed": return `Context refreshed for "${conn}"`
    case "member.invited": return `Invited ${String(m.email ?? "member")} as ${String(m.role ?? "user")}`
    case "member.role_changed": return `Changed role of ${String(m.email ?? "member")} to ${String(m.new_role ?? "?")}`
    case "member.removed": return `Removed member ${String(m.email ?? "member")}`
    case "billing.plan_changed": return `Plan changed to ${String(m.new_plan ?? "?")}`
    case "billing.cancelled": return `Billing cancelled`
    default: return e.event_type
  }
}

// Event dot colour
function eventDot(event_type: string): string {
  if (event_type.includes("degraded") || event_type.includes("deleted")) return "bg-danger"
  if (event_type.includes("recovered") || event_type.includes("created")) return "bg-success"
  if (event_type.includes("billing") || event_type.includes("role") || event_type.includes("removed")) return "bg-warning"
  if (event_type.includes("member") || event_type.includes("invited")) return "bg-brand"
  return "bg-[var(--text-muted)]"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return d
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrgAuditPage() {
  const [eventType, setEventType] = useState("")
  const [connectionId, setConnectionId] = useState("")
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"))
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  // Connections for the connection filter dropdown
  const { data: conns } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list() as Promise<Connection[]>,
    staleTime: 5 * 60_000,
  })

  const { data: events, isLoading, isFetching } = useQuery<AuditEvent[]>({
    queryKey: ["org-audit-log", eventType, connectionId, fromDate, toDate, offset],
    queryFn: () =>
      auditApi.list({
        event_type: eventType || undefined,
        connection_id: connectionId || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        limit: LIMIT,
        offset,
      }) as Promise<AuditEvent[]>,
    staleTime: 30_000,
  })

  const rows = events ?? []
  const canNext = rows.length === LIMIT

  function handleExport() {
    const url = auditApi.exportUrl({
      event_type: eventType || undefined,
      connection_id: connectionId || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    })
    window.open(url, "_blank")
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ScrollText size={16} className="text-[var(--text-muted)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Audit Log</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Events for this organisation only — immutable record
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-[var(--border)] text-[var(--text-muted)] hover:bg-surface-2 transition-colors"
        >
          <Download size={12} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={eventType}
          onChange={(e) => { setEventType(e.target.value); setOffset(0) }}
          className="h-8 px-2.5 text-xs rounded border border-[var(--border)] bg-surface text-[var(--text)] outline-none focus:ring-1 focus:ring-brand-mid"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {(conns ?? []).length > 0 && (
          <select
            value={connectionId}
            onChange={(e) => { setConnectionId(e.target.value); setOffset(0) }}
            className="h-8 px-2.5 text-xs rounded border border-[var(--border)] bg-surface text-[var(--text)] outline-none focus:ring-1 focus:ring-brand-mid"
          >
            <option value="">All connections</option>
            {(conns ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setOffset(0) }}
            className="h-8 px-2.5 text-xs rounded border border-[var(--border)] bg-surface text-[var(--text)] outline-none focus:ring-1 focus:ring-brand-mid"
          />
          <span className="text-[var(--text-muted)] text-xs">→</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setOffset(0) }}
            className="h-8 px-2.5 text-xs rounded border border-[var(--border)] bg-surface text-[var(--text)] outline-none focus:ring-1 focus:ring-brand-mid"
          />
        </div>

        {isFetching && <Loader2 size={13} className="animate-spin text-[var(--text-muted)]" />}
      </div>

      {/* Events */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="md" /></div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          heading="No audit events"
          body="No events match the current filters."
        />
      ) : (
        <div className="bg-surface rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-surface-2">
                {["Timestamp", "Event", "Connection", "Details"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((event) => (
                <tr key={event.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {format(new Date(event.created_at), "MMM d, yyyy HH:mm:ss")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", eventDot(event.event_type))} />
                      <span className="text-xs font-mono text-[var(--text-dim)]">{event.event_type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {event.connection_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-dim)] max-w-xs">
                    {describeEvent(event)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)]">
              Showing {offset + 1}–{offset + rows.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
                disabled={offset === 0}
                className="px-3 py-1 text-xs rounded border border-[var(--border)] disabled:opacity-40 hover:bg-surface-2 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset((o) => o + LIMIT)}
                disabled={!canNext}
                className="px-3 py-1 text-xs rounded border border-[var(--border)] disabled:opacity-40 hover:bg-surface-2 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
