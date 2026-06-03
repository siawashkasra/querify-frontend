"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { formatDistanceToNow, format } from "date-fns"
import {
  RotateCcw, AlertTriangle, Search, Loader2,
  CheckCircle2, XCircle, ArrowRight, Clock,
} from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { QueryReplayLoad, ReplayResult } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  success: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-600 border-red-200",
  timeout: "bg-amber-50 text-amber-700 border-amber-200",
  unsafe: "bg-orange-50 text-orange-700 border-orange-200",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border",
      STATUS_COLOR[status.toLowerCase()] ?? "bg-gray-50 text-gray-500 border-gray-200"
    )}>
      {status === "success" ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {status}
    </span>
  )
}

function CodeBlock({ code, label }: { code: string | null; label: string }) {
  if (!code) return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">{label}</p>
      <p className="text-xs text-gray-400 italic">None</p>
    </div>
  )
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">{label}</p>
      <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{code}</pre>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QueryReplayPage() {
  const [messageId, setMessageId] = useState("")
  const [original, setOriginal] = useState<QueryReplayLoad | null>(null)
  const [replayResult, setReplayResult] = useState<ReplayResult | null>(null)

  const loadMutation = useMutation({
    mutationFn: (id: string) => adminApi.loadQueryReplay(id),
    onSuccess: (data) => {
      setOriginal(data)
      setReplayResult(null)
    },
  })

  const replayMutation = useMutation({
    mutationFn: () => adminApi.replayQuery(original!.message_id),
    onSuccess: (data) => setReplayResult(data),
  })

  function handleLoad(e: React.FormEvent) {
    e.preventDefault()
    const id = messageId.trim()
    if (!id) return
    loadMutation.mutate(id)
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <RotateCcw size={18} className="text-gray-400" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Query Replay</h1>
          <p className="text-sm text-gray-400 mt-0.5">Re-run a historical query through the current pipeline for debugging</p>
        </div>
      </div>

      {/* Permanent warning banner — not dismissible */}
      <div className="flex items-start gap-3 bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Replayed results are for debugging only. Not visible to tenant.</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Replays are logged in the audit log with your admin ID. The replay result is never saved to the tenant's history.
          </p>
        </div>
      </div>

      {/* Message ID input */}
      <form onSubmit={handleLoad} className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Enter message UUID…"
            value={messageId}
            onChange={(e) => setMessageId(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
          />
        </div>
        <button
          type="submit"
          disabled={!messageId.trim() || loadMutation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {loadMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Load
        </button>
      </form>

      {/* Load error */}
      {loadMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-700 font-medium">Failed to load query</p>
          <p className="text-xs text-red-600 mt-0.5">{(loadMutation.error as Error).message}</p>
        </div>
      )}

      {/* Loaded query */}
      {original && (
        <div className="flex flex-col gap-6">
          {/* Metadata strip */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Tenant</p>
              <p className="text-sm font-medium text-gray-800">{original.tenant_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Connection</p>
              <p className="text-sm text-gray-600">{original.connection_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Context version</p>
              <p className="text-sm font-mono text-gray-600">
                {original.context_version != null ? `v${original.context_version}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Schema version</p>
              <p className="text-sm font-mono text-gray-600">{original.schema_version ?? "—"}</p>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Original timestamp</p>
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Clock size={11} />
                {format(new Date(original.created_at), "MMM d, yyyy HH:mm:ss")}
                {" — "}
                {formatDistanceToNow(new Date(original.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Original */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Original</p>
                <StatusBadge status={original.original_status} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Prompt</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                  {original.prompt}
                </p>
              </div>
              <CodeBlock code={original.original_sql} label="Generated SQL" />
              {original.original_result_summary && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Result summary</p>
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">{original.original_result_summary}</p>
                </div>
              )}
            </div>

            {/* Replay result */}
            <div className={cn(
              "rounded-xl border p-5 flex flex-col gap-4",
              replayResult
                ? "bg-white border-gray-200"
                : "bg-gray-50 border-dashed border-gray-200"
            )}>
              {replayResult ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Replayed</p>
                    <StatusBadge status={replayResult.new_status} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Prompt</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                      {original.prompt}
                    </p>
                  </div>
                  <CodeBlock code={replayResult.new_sql} label="New SQL" />
                  {replayResult.new_result_summary && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Result summary</p>
                      <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">{replayResult.new_result_summary}</p>
                    </div>
                  )}
                  {replayResult.execution_ms != null && (
                    <p className="text-xs text-gray-400">Execution: {replayResult.execution_ms} ms</p>
                  )}
                  {replayResult.diff_notes && (
                    <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-violet-700 mb-1">Diff notes</p>
                      <p className="text-xs text-violet-600">{replayResult.diff_notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-8 text-center">
                  <ArrowRight size={24} className="text-gray-300" />
                  <p className="text-sm text-gray-400">Replay result will appear here</p>
                  <button
                    onClick={() => replayMutation.mutate()}
                    disabled={replayMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    {replayMutation.isPending
                      ? <Loader2 size={14} className="animate-spin" />
                      : <RotateCcw size={14} />}
                    {replayMutation.isPending ? "Replaying…" : "Replay query"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Replay button (also shown after result) */}
          {replayResult && (
            <div className="flex justify-center">
              <button
                onClick={() => replayMutation.mutate()}
                disabled={replayMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-200 text-violet-700 text-sm font-medium hover:bg-violet-50 disabled:opacity-50 transition-colors"
              >
                {replayMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Replay again
              </button>
            </div>
          )}

          {/* Replay error */}
          {replayMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-700 font-medium">Replay failed</p>
              <p className="text-xs text-red-600 mt-0.5">{(replayMutation.error as Error).message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
