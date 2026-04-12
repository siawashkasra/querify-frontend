"use client"

import { useState, useCallback, useRef } from "react"
import { ThumbsUp, ThumbsDown, Download, MessageSquarePlus, Clock, Cpu, ChevronDown } from "lucide-react"
import { toast } from "react-hot-toast"
import { query as queryApi, exports as exportsApi } from "@/lib/api"
import { cn } from "@/lib/cn"
import type { ExportJob } from "@/types"

interface ResultFooterProps {
  messageId: string
  executionMs: number | null
  totalMs: number | null
  modelUsed?: string | null
  initialFeedback?: 1 | -1 | null
  onFollowUp?: () => void
}

export const ResultFooter = ({ messageId, executionMs, totalMs, modelUsed, initialFeedback, onFollowUp }: ResultFooterProps) => {
  const [feedback, setFeedback] = useState<1 | -1 | null>(initialFeedback ?? null)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const handleFeedback = useCallback(async (score: 1 | -1) => {
    const next = feedback === score ? null : score
    setFeedback(next)
    try {
      if (next) await queryApi.feedback(messageId, next)
    } catch { /* optimistic — silent fail */ }
  }, [feedback, messageId])

  const handleExport = useCallback(async (format: "csv" | "pdf" | "xlsx") => {
    setExportOpen(false)
    toast.loading("Preparing export…", { id: `export-${messageId}` })
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
        { id: `export-${messageId}`, duration: 10000 }
      )
    } catch {
      toast.error("Export failed. Try again.", { id: `export-${messageId}` })
    }
  }, [messageId])

  const displayTime = totalMs ? (totalMs / 1000).toFixed(1) : executionMs ? (executionMs / 1000).toFixed(1) : null

  return (
    <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
      <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
        {displayTime && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)]">
            <Clock size={10} /> {displayTime}s
          </span>
        )}
        {modelUsed && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)]">
            <Cpu size={10} /> {modelUsed}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => handleFeedback(1)}
          className={cn("p-1.5 rounded-md transition-colors", feedback === 1 ? "bg-success/10 text-success" : "text-[var(--text-muted)] hover:text-success hover:bg-success/5")}
          title="Helpful"
        >
          <ThumbsUp size={13} fill={feedback === 1 ? "currentColor" : "none"} />
        </button>
        <button
          onClick={() => handleFeedback(-1)}
          className={cn("p-1.5 rounded-md transition-colors", feedback === -1 ? "bg-danger/10 text-danger" : "text-[var(--text-muted)] hover:text-danger hover:bg-danger/5")}
          title="Not helpful"
        >
          <ThumbsDown size={13} fill={feedback === -1 ? "currentColor" : "none"} />
        </button>

        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen((o) => !o)}
            className="flex items-center gap-1 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-[var(--surface)] transition-colors"
            title="Export"
          >
            <Download size={13} />
            <ChevronDown size={9} />
          </button>
          {exportOpen && (
            <div className="absolute right-0 bottom-8 z-10 w-28 rounded-lg border border-[var(--border)] bg-white shadow-lg overflow-hidden">
              {(["csv", "pdf", "xlsx"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  className="w-full text-left px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {onFollowUp && (
          <button
            onClick={onFollowUp}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[var(--text-muted)] hover:text-brand hover:bg-[var(--brand-light)] transition-colors"
          >
            <MessageSquarePlus size={12} />
            Follow up
          </button>
        )}
      </div>
    </div>
  )
}

export default ResultFooter
