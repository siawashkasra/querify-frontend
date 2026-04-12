"use client"

import { useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { Database, CheckCircle, XCircle, RefreshCw, Pencil, Trash2 } from "lucide-react"
import { toast } from "react-hot-toast"
import { connections as connectionsApi } from "@/lib/api"
import { cn } from "@/lib/cn"
import Badge from "@/components/ui/Badge"
import Spinner from "@/components/ui/Spinner"
import type { Connection, ConnectionStatus } from "@/types"

const STATUS_CFG: Record<ConnectionStatus, { dot: string; badge: "active" | "degraded" | "inactive" | "pending" }> = {
  active: { dot: "bg-success", badge: "active" },
  error: { dot: "bg-danger", badge: "degraded" },
  pending: { dot: "bg-brand-mid", badge: "pending" },
  untested: { dot: "bg-[var(--text-muted)]", badge: "inactive" },
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
      <span className="text-sm text-[var(--text)] font-mono">{value ?? <span className="text-[var(--text-muted)] italic not-italic font-sans">—</span>}</span>
    </div>
  )
}

interface ConnectionDetailCardProps {
  connection: Connection
  onEdit: () => void
  onDelete: () => void
}

export const ConnectionDetailCard = ({ connection, onEdit, onDelete }: ConnectionDetailCardProps) => {
  const qc = useQueryClient()
  const [testing, setTesting] = useState(false)
  const [introspecting, setIntrospecting] = useState(false)
  const [inferring, setInferring] = useState(false)
  const cfg = STATUS_CFG[connection.status] ?? STATUS_CFG.untested

  const metricsCount = (() => {
    const m = connection.context_layer?.metrics
    return Array.isArray(m) ? m.length : typeof m === "object" && m ? Object.keys(m).length : 0
  })()

  const pollUntilActive = useCallback(async (id: string) => {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      const updated = await connectionsApi.get(id) as Connection
      qc.setQueryData<Connection[]>(["connections"], (old) => old?.map((c) => c.id === id ? updated : c) ?? old)
      if (updated.status === "active") return updated
    }
  }, [qc])

  const handleTest = useCallback(async () => {
    setTesting(true)
    try {
      const result = await connectionsApi.testExisting(connection.id)
      if (result.success) {
        toast.success(`Connected in ${result.latency_ms}ms`)
        qc.setQueryData<Connection[]>(["connections"], (old) => old?.map((c) => c.id === connection.id ? { ...c, status: "active" as ConnectionStatus, last_tested_at: new Date().toISOString() } : c) ?? old)
      } else {
        toast.error(result.message || "Connection test failed")
        qc.setQueryData<Connection[]>(["connections"], (old) => old?.map((c) => c.id === connection.id ? { ...c, status: "error" as ConnectionStatus } : c) ?? old)
      }
    } catch {
      toast.error("Could not test connection")
    } finally {
      setTesting(false)
    }
  }, [connection.id, qc])

  const handleIntrospect = useCallback(async () => {
    setIntrospecting(true)
    const tid = toast.loading("Reading schema…")
    try {
      await connectionsApi.introspect(connection.id)
      await pollUntilActive(connection.id)
      await qc.invalidateQueries({ queryKey: ["connections"] })
      toast.success("Schema refreshed", { id: tid })
    } catch {
      toast.error("Schema refresh failed", { id: tid })
    } finally {
      setIntrospecting(false)
    }
  }, [connection.id, pollUntilActive, qc])

  const handleInfer = useCallback(async () => {
    setInferring(true)
    const tid = toast.loading("Re-analysing your database…")
    try {
      await connectionsApi.inferContext(connection.id)
      await qc.invalidateQueries({ queryKey: ["connections"] })
      toast.success("Context refreshed", { id: tid })
    } catch {
      toast.error("Context refresh failed", { id: tid })
    } finally {
      setInferring(false)
    }
  }, [connection.id, qc])

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[var(--surface-3)] border border-[var(--border)]">
            <Database size={16} className="text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">{connection.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{connection.host}:{connection.port}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
          <Badge variant={cfg.badge}>{connection.status}</Badge>
          <Badge variant="default">{connection.db_type}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-5 py-4">
        <Field label="Host" value={connection.host} />
        <Field label="Port" value={connection.port} />
        <Field label="Database" value={connection.database_name} />
        <Field label="Username" value={connection.username} />
        <Field label="Password" value="●●●●●●●●" />
        <Field label="SSL mode" value={connection.ssl_mode} />
        <Field label="Tables" value={connection.table_count ?? "—"} />
        <Field label="Context version" value={connection.context_version ? `v${connection.context_version}` : "—"} />
        <Field label="Metrics detected" value={metricsCount > 0 ? metricsCount : "—"} />
        {connection.last_introspected_at && (
          <Field label="Last introspected" value={format(new Date(connection.last_introspected_at), "MMM d, yyyy")} />
        )}
        {connection.last_tested_at && (
          <Field label="Last tested" value={format(new Date(connection.last_tested_at), "MMM d, yyyy HH:mm")} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-[var(--surface-2)] border-t border-[var(--border)]">
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-white text-[var(--text-dim)] hover:border-brand/40 hover:text-brand hover:bg-[var(--brand-light)] transition-colors disabled:opacity-50"
        >
          {testing ? <Spinner size="sm" /> : <CheckCircle size={12} />}
          Test connection
        </button>
        <button
          onClick={handleIntrospect}
          disabled={introspecting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-white text-[var(--text-dim)] hover:border-brand/40 hover:text-brand hover:bg-[var(--brand-light)] transition-colors disabled:opacity-50"
        >
          {introspecting ? <Spinner size="sm" /> : <RefreshCw size={12} />}
          Refresh schema
        </button>
        <button
          onClick={handleInfer}
          disabled={inferring}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-white text-[var(--text-dim)] hover:border-brand/40 hover:text-brand hover:bg-[var(--brand-light)] transition-colors disabled:opacity-50"
        >
          {inferring ? <Spinner size="sm" /> : <RefreshCw size={12} />}
          Refresh context
        </button>
        <div className="flex-1" />
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-white text-[var(--text-dim)] hover:border-brand/40 hover:text-brand hover:bg-[var(--brand-light)] transition-colors"
        >
          <Pencil size={12} />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-danger/30 bg-white text-danger hover:bg-danger/5 transition-colors"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  )
}

export default ConnectionDetailCard
