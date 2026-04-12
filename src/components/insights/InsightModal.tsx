"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { X, MessageSquarePlus } from "lucide-react"
import { format } from "date-fns"
import { useMutation } from "@tanstack/react-query"
import { query as queryApi } from "@/lib/api"
import { useAppStore } from "@/store/appStore"
import { cn } from "@/lib/cn"
import QueryChart from "@/components/chat/QueryChart"
import type { Insight, InsightType } from "@/types"

const TYPE_LABELS: Record<InsightType, string> = {
  revenue_trend: "Revenue",
  new_users: "Growth",
  churn_signal: "Churn",
  top_performer: "Top performer",
  anomaly: "Anomaly",
}

interface InsightModalProps {
  insight: Insight | null
  onClose: () => void
}

export const InsightModal = ({ insight, onClose }: InsightModalProps) => {
  const router = useRouter()
  const { activeConnectionId } = useAppStore()

  const createSessionMutation = useMutation({
    mutationFn: () => queryApi.createSession({ connection_id: activeConnectionId! }),
    onSuccess: (session) => {
      onClose()
      const prompt = encodeURIComponent(`Tell me more about: ${insight?.headline || insight?.title}`)
      router.push(`/chat/${session.id}?prompt=${prompt}`)
    },
  })

  const handleFollowUp = useCallback(() => {
    if (!activeConnectionId || !insight) return
    createSessionMutation.mutate()
  }, [activeConnectionId, insight, createSessionMutation])

  const ts = insight?.generated_at || insight?.created_at
  const chartRows = Array.isArray(insight?.data_snapshot?.rows)
    ? insight.data_snapshot!.rows as Record<string, unknown>[]
    : []

  return (
    <Dialog.Root open={!!insight} onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-lg max-h-[85vh] overflow-y-auto",
            "rounded-xl border border-[var(--border)] bg-white shadow-xl p-6",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "duration-200"
          )}
        >
          <Dialog.Close className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors">
            <X size={16} />
          </Dialog.Close>

          {insight && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 flex-wrap pr-8">
                <span className="text-xs font-medium px-2 py-0.5 rounded-sm border bg-[var(--brand-light)] text-brand border-brand/20">
                  {TYPE_LABELS[insight.type] ?? insight.type}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {ts ? format(new Date(ts), "MMM d, yyyy 'at' HH:mm") : ""}
                </span>
              </div>

              <div>
                <Dialog.Title className="text-base font-semibold text-[var(--text)] leading-snug">
                  {insight.headline || insight.title}
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-[var(--text-dim)] leading-relaxed">
                  {insight.summary || insight.description}
                </Dialog.Description>
              </div>

              {insight.chart_config && chartRows.length >= 2 && (
                <QueryChart config={insight.chart_config} rows={chartRows} />
              )}

              <div className="pt-2 border-t border-[var(--border)] flex justify-end">
                <button
                  onClick={handleFollowUp}
                  disabled={!activeConnectionId || createSessionMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark disabled:opacity-50 transition-colors"
                >
                  <MessageSquarePlus size={14} />
                  {createSessionMutation.isPending ? "Opening chat…" : "Ask a follow-up question"}
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default InsightModal
