"use client"

import { useState } from "react"
import { Clock, RefreshCw, X } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import { connections as connectionsApi } from "@/lib/api"
import { cn } from "@/lib/cn"
import Spinner from "@/components/ui/Spinner"
import type { Connection } from "@/types"

interface RefreshSuggestionBannerProps {
  connection: Connection
}

const DISMISS_KEY = (id: string) => `staleness_dismissed_until_${id}`

function isDismissed(connectionId: string): boolean {
  if (typeof window === "undefined") return false
  const raw = localStorage.getItem(DISMISS_KEY(connectionId))
  if (!raw) return false
  return Date.now() < parseInt(raw, 10)
}

function dismissFor7Days(connectionId: string): void {
  const until = Date.now() + 7 * 24 * 60 * 60 * 1000
  localStorage.setItem(DISMISS_KEY(connectionId), String(until))
}

export function RefreshSuggestionBanner({ connection }: RefreshSuggestionBannerProps) {
  const [localDismissed, setLocalDismissed] = useState(() => isDismissed(connection.id))
  // Stable snapshot of current time — only needed once on mount for age calculation
  const [now] = useState(Date.now)
  const qc = useQueryClient()
  const level = connection.staleness_level

  const refreshMutation = useMutation({
    mutationFn: () => connectionsApi.inferContext(connection.id) as Promise<unknown>,
    onMutate: () => toast.loading("Refreshing context — this takes about 30 seconds", { id: "ctx-refresh" }),
    onSuccess: () => {
      toast.success("Context refreshed. Your queries should be more accurate now.", { id: "ctx-refresh" })
      qc.invalidateQueries({ queryKey: ["connections"] })
      qc.invalidateQueries({ queryKey: ["connection", connection.id] })
    },
    onError: () => toast.error("Context refresh failed.", { id: "ctx-refresh" }),
  })

  if (localDismissed || (level !== "stale" && level !== "very_stale")) return null

  const isVeryStale = level === "very_stale"

  const daysOld = connection.last_introspected_at
    ? Math.floor((now - new Date(connection.last_introspected_at).getTime()) / 86_400_000)
    : null

  const handleDismiss = () => {
    dismissFor7Days(connection.id)
    setLocalDismissed(true)
  }

  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3 border rounded-lg mx-4 mt-3 text-sm",
      isVeryStale
        ? "bg-amber-50 border-amber-300 text-amber-900"
        : "bg-amber-50/60 border-amber-200 text-amber-800"
    )}>
      <Clock size={15} className="shrink-0 mt-0.5 text-amber-500" />
      <div className="flex-1 min-w-0">
        {isVeryStale ? (
          <>
            <p className="font-medium">Your AI context appears to be outdated.</p>
            {connection.pending_suggestion && (
              <p className="mt-0.5 text-xs opacity-80">{connection.pending_suggestion}</p>
            )}
          </>
        ) : (
          <>
            <p className="font-medium">
              {daysOld !== null
                ? `Your context was last updated ${daysOld} day${daysOld === 1 ? "" : "s"} ago.`
                : "Your context may be outdated."}
            </p>
            <p className="mt-0.5 text-xs opacity-80">Refreshing it may improve accuracy.</p>
          </>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors",
              isVeryStale
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-amber-100 text-amber-800 hover:bg-amber-200"
            )}
          >
            {refreshMutation.isPending ? <Spinner size="sm" /> : <RefreshCw size={11} />}
            Refresh now
          </button>
          <button onClick={handleDismiss} className="px-3 py-1 rounded text-xs opacity-60 hover:opacity-100 transition-opacity">
            {isVeryStale ? "Dismiss for 7 days" : "Remind me later"}
          </button>
        </div>
      </div>
      <button onClick={handleDismiss} className="shrink-0 p-0.5 rounded hover:bg-amber-100 transition-colors opacity-50 hover:opacity-100" aria-label="Dismiss">
        <X size={13} />
      </button>
    </div>
  )
}

export default RefreshSuggestionBanner
