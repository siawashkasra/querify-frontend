"use client"

// ReverifyCard — the honest "your connection needs re-verification" answer.
// Shown when the backend refuses a stale-engine model (FIX 1). One sentence +
// a one-click re-verify action that re-runs the verification pipeline.

import { useState } from "react"
import { ShieldAlert, RefreshCw } from "lucide-react"
import { connections as connectionsApi } from "@/lib/api"

interface Props {
  message: string
  connectionId?: string | null
  onReverified?: () => void
}

export function ReverifyCard({ message, connectionId, onReverified }: Props) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle")

  async function reverify() {
    if (!connectionId || state === "running") return
    setState("running")
    try {
      await connectionsApi.retryPipeline(connectionId)
      setState("done")
      onReverified?.()
    } catch {
      setState("error")
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-800 rounded-2xl shadow-sm px-5 py-4">
      <div className="flex items-start gap-2.5">
        <span className="flex-shrink-0 mt-0.5 text-amber-500">
          <ShieldAlert size={16} />
        </span>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{message}</p>
      </div>
      <div className="mt-3 pl-7">
        {state === "done" ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Re-verification started — this takes a moment. Ask your question again shortly.
          </p>
        ) : (
          <button
            onClick={reverify}
            disabled={!connectionId || state === "running"}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={state === "running" ? "animate-spin" : undefined} />
            {state === "running" ? "Starting re-verification…" : "Re-verify connection"}
          </button>
        )}
        {state === "error" && (
          <p className="mt-2 text-xs text-red-500">Couldn&apos;t start re-verification. Please try again.</p>
        )}
      </div>
    </div>
  )
}

export default ReverifyCard
