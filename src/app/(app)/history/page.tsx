"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import {
  Search, ChevronDown, ThumbsUp, ThumbsDown, Copy, Check,
  RotateCcw, Download, MessageSquarePlus, Clock, AlertCircle,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { query as queryApi, connections as connectionsApi, exports as exportsApi } from "@/lib/api"
import { useAppStore } from "@/store/appStore"
import { usePlan } from "@/hooks/usePlan"
import { UpgradePromptInline } from "@/components/billing/UpgradePrompt"
import { cn } from "@/lib/cn"
import SQLDisclosure from "@/components/chat/SQLDisclosure"
import DataTable from "@/components/chat/DataTable"
import EmptyState from "@/components/ui/EmptyState"
import type { ChatMessage, Connection, MessageStatus, ExportJob } from "@/types"

const PAGE_SIZE = 20

const STATUS_CONFIG: Record<MessageStatus, { label: string; className: string }> = {
  success: { label: "Success", className: "bg-success/10 text-success border-success/20" },
  failed: { label: "Failed", className: "bg-danger/10 text-danger border-danger/20" },
  pending: { label: "Pending", className: "bg-brand/10 text-brand border-brand/20" },
  empty: { label: "Empty", className: "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20" },
  timeout: { label: "Timeout", className: "bg-warning/10 text-warning border-warning/20" },
  unsafe: { label: "Unsafe", className: "bg-warning/10 text-warning border-warning/20" },
  declined: { label: "Clarify", className: "bg-brand/10 text-brand border-brand/20" },
  clarify_needed: { label: "Clarify", className: "bg-brand/10 text-brand border-brand/20" },
  needs_reverification: { label: "Re-verify", className: "bg-warning/10 text-warning border-warning/20" },
}

function StatusBadge({ status }: { status: MessageStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border shrink-0", cfg.className)}>
      {cfg.label}
    </span>
  )
}

async function runExport(messageId: string, format: "csv" | "pdf" | "xlsx") {
  toast.loading("Preparing export…", { id: `exp-${messageId}` })
  try {
    const job = await exportsApi.create({ message_id: messageId, format })
    const poll = async (id: string, attempts: number): Promise<ExportJob> => {
      if (attempts <= 0) throw new Error("Export timed out")
      const result = await exportsApi.get(id)
      if (result.status === "done") return result
      if (result.status === "failed") throw new Error("Export failed")
      await new Promise((r) => setTimeout(r, 2000))
      return poll(id, attempts - 1)
    }
    const done = await poll(job.id, 30)
    toast.success(
      (t) => (
        <span className="flex items-center gap-2 text-sm">
          Download ready
          {done.file_url && (
            <a href={done.file_url} target="_blank" rel="noreferrer" className="underline text-brand font-medium" onClick={() => toast.dismiss(t.id)}>
              Download
            </a>
          )}
        </span>
      ),
      { id: `exp-${messageId}`, duration: 10000 }
    )
  } catch {
    toast.error("Export failed.", { id: `exp-${messageId}` })
  }
}

function ExportMenu({ messageId, canExport }: { messageId: string; canExport: boolean }) {
  const [open, setOpen] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)

  if (!canExport) {
    return (
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowUpgrade((o) => !o) }}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-[var(--surface-3)] border border-transparent hover:border-[var(--border)] transition-colors"
          title="Export (upgrade required)"
        >
          <Download size={12} />
          Export
        </button>
        {showUpgrade && (
          <div className="absolute right-0 top-8 z-20 w-72" onClick={(e) => e.stopPropagation()}>
            <UpgradePromptInline feature="Exports" plan="Starter" price={29} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-[var(--surface-3)] border border-transparent hover:border-[var(--border)] transition-colors"
        title="Export"
      >
        <Download size={12} />
        Export
        <ChevronDown size={9} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-10 w-24 rounded-lg border border-[var(--border)] bg-white shadow-lg overflow-hidden">
          {(["csv", "pdf", "xlsx"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={(e) => { e.stopPropagation(); setOpen(false); runExport(messageId, fmt) }}
              className="w-full text-left px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface HistoryRowProps {
  msg: ChatMessage
  connectionId: string | null
  isExpanded: boolean
  onToggle: () => void
  canExport: boolean
}

function HistoryRow({ msg, connectionId, isExpanded, onToggle, canExport }: HistoryRowProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const askAgainMutation = useMutation({
    mutationFn: async () => {
      if (!connectionId) throw new Error("No connection selected")
      const session = await queryApi.createSession({ connection_id: connectionId })
      return session
    },
    onSuccess: (session) => {
      const prompt = encodeURIComponent(msg.prompt)
      router.push(`/chat/${session.id}?prompt=${prompt}`)
    },
    onError: () => toast.error("Could not start a new chat."),
  })

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(msg.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [msg.prompt])

  const previewRows: Record<string, unknown>[] = useMemo(() => {
    if (!msg.result_preview?.rows || !msg.result_columns) return []
    return msg.result_preview.rows.slice(0, 3).map((row) => {
      const obj: Record<string, unknown> = {}
      msg.result_columns!.forEach((col, i) => { obj[col] = Array.isArray(row) ? row[i] : null })
      return obj
    })
  }, [msg.result_preview, msg.result_columns])

  return (
    <div className={cn(
      "rounded-lg border bg-white transition-shadow",
      isExpanded ? "border-brand/30 shadow-sm" : "border-[var(--border)] hover:border-[var(--border-2)]"
    )}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none group"
        onClick={onToggle}
      >
        <StatusBadge status={msg.status} />

        <p className={cn(
          "flex-1 text-sm text-[var(--text)] min-w-0 truncate",
          isExpanded && "font-medium"
        )}>
          {msg.prompt.slice(0, 100)}{msg.prompt.length > 100 ? "…" : ""}
        </p>

        <div className="flex items-center gap-3 shrink-0">
          {msg.feedback_score != null && (
            <span className={cn("text-xs", msg.feedback_score === 1 ? "text-success" : "text-danger")}>
              {msg.feedback_score === 1 ? <ThumbsUp size={12} fill="currentColor" /> : <ThumbsDown size={12} fill="currentColor" />}
            </span>
          )}
          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap hidden sm:block">
            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
          </span>
          {msg.execution_ms && (
            <span className="text-xs font-mono text-[var(--text-muted)] hidden md:block w-14 text-right">
              {msg.execution_ms}ms
            </span>
          )}

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-[var(--surface-3)] border border-transparent hover:border-[var(--border)] transition-colors"
              title="Copy prompt"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); askAgainMutation.mutate() }}
              disabled={askAgainMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:text-brand hover:bg-[var(--brand-light)] border border-transparent hover:border-brand/20 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={12} />
              Ask again
            </button>
            <ExportMenu messageId={msg.id} canExport={canExport} />
          </div>

          <ChevronDown size={14} className={cn("text-[var(--text-muted)] transition-transform shrink-0", isExpanded && "rotate-180")} />
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-[var(--border)] px-4 py-3 flex flex-col gap-3">
          {msg.prompt.length > 100 && (
            <p className="text-sm text-[var(--text)] leading-relaxed">{msg.prompt}</p>
          )}

          {msg.status === "failed" && (
            <div className="flex flex-col gap-2">
              {msg.error_type && (
                <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-danger/10 text-danger border border-danger/20">
                  {msg.error_type}
                </span>
              )}
              {msg.error_message && (
                <div className="rounded-lg bg-danger/5 border border-danger/20 px-3 py-2">
                  <p className="text-xs font-mono text-danger leading-relaxed">{msg.error_message}</p>
                </div>
              )}
              <button
                onClick={() => askAgainMutation.mutate()}
                disabled={askAgainMutation.isPending}
                className="flex w-fit items-center gap-1.5 text-xs text-brand hover:underline disabled:opacity-50"
              >
                <MessageSquarePlus size={12} />
                Try asking differently
              </button>
            </div>
          )}

          {msg.status === "success" && msg.result_summary && (
            <p className="text-sm text-[var(--text-dim)] leading-relaxed">{msg.result_summary}</p>
          )}

          {previewRows.length > 0 && msg.result_columns && (
            <DataTable columns={msg.result_columns} rows={previewRows} />
          )}

          {msg.sql_generated && <SQLDisclosure sql={msg.sql_generated} />}
        </div>
      )}
    </div>
  )
}

type StatusFilter = "all" | "success" | "failed"
type SortOrder = "newest" | "oldest"

export default function HistoryPage() {
  const { activeConnectionId } = useAppStore()
  const { canExport } = usePlan()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")
  const [connFilter, setConnFilter] = useState<string>("all")
  const [loadedCount, setLoadedCount] = useState(PAGE_SIZE)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: allConnections } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list() as Promise<Connection[]>,
    staleTime: 60_000,
  })

  const { data: messages, isLoading, error, refetch } = useQuery<ChatMessage[]>({
    queryKey: ["history", connFilter === "all" ? activeConnectionId : connFilter, loadedCount],
    queryFn: () => queryApi.history({
      connection_id: connFilter !== "all" ? connFilter : activeConnectionId ?? undefined,
      limit: loadedCount,
      offset: 0,
    }) as Promise<ChatMessage[]>,
    staleTime: 30_000,
  })

  const filtered = useMemo(() => {
    let list = messages ?? []
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((m) => m.prompt.toLowerCase().includes(q))
    }
    if (statusFilter !== "all") list = list.filter((m) => m.status === statusFilter)
    if (sortOrder === "oldest") list = [...list].reverse()
    return list
  }, [messages, search, statusFilter, sortOrder])

  const showLoadMore = (messages?.length ?? 0) >= loadedCount

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--text)]">Query History</h1>
          {messages && (
            <p className="text-xs text-[var(--text-muted)]">
              Showing {filtered.length} of {messages.length} {messages.length === loadedCount ? "loaded" : ""} queries
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[180px] h-8 rounded-lg border border-[var(--border)] bg-white px-3 focus-within:border-brand transition-colors">
            <Search size={13} className="text-[var(--text-muted)] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search queries…"
              className="flex-1 bg-transparent text-sm outline-none text-[var(--text)] placeholder-[var(--text-muted)]"
            />
          </div>

          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-xs">
            {(["all", "success", "failed"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 h-8 font-medium capitalize transition-colors",
                  statusFilter === s ? "bg-brand text-white" : "bg-white text-[var(--text-dim)] hover:bg-[var(--surface-3)]"
                )}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {(allConnections?.length ?? 0) > 1 && (
            <select
              value={connFilter}
              onChange={(e) => setConnFilter(e.target.value)}
              className="h-8 rounded-lg border border-[var(--border)] bg-white px-2 text-xs text-[var(--text)] outline-none focus:border-brand transition-colors"
            >
              <option value="all">All connections</option>
              {allConnections!.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="h-8 rounded-lg border border-[var(--border)] bg-white px-2 text-xs text-[var(--text)] outline-none focus:border-brand transition-colors"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-[var(--surface-3)] animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3 text-sm text-[var(--text-muted)]">
            <AlertCircle size={14} className="text-warning shrink-0" />
            <span>Could not load history.</span>
            <button onClick={() => refetch()} className="text-xs text-brand hover:underline">Retry</button>
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <>
            {search || statusFilter !== "all" ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Search size={24} className="text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-dim)]">No queries match your filters.</p>
                <button onClick={() => { setSearch(""); setStatusFilter("all") }} className="text-xs text-brand hover:underline">
                  Clear filters
                </button>
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                heading="No queries yet"
                body="Your questions will appear here. Start by asking something about your data."
                ctaLabel="Ask your first question"
                onCta={() => window.location.assign("/chat/new")}
              />
            )}
          </>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="flex flex-col gap-2">
            {filtered.map((msg) => (
              <HistoryRow
                key={msg.id}
                msg={msg}
                connectionId={activeConnectionId}
                isExpanded={expandedId === msg.id}
                canExport={canExport}
                onToggle={() => setExpandedId((id) => id === msg.id ? null : msg.id)}
              />
            ))}
          </div>
        )}

        {!isLoading && showLoadMore && (
          <button
            onClick={() => setLoadedCount((n) => n + PAGE_SIZE)}
            className="self-center px-5 py-2 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text-dim)] hover:border-brand/40 hover:text-brand hover:bg-[var(--brand-light)] transition-colors"
          >
            Load {PAGE_SIZE} more
          </button>
        )}
      </div>
    </div>
  )
}
