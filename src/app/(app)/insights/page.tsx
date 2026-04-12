"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Sparkles, CheckCheck } from "lucide-react"
import { insights as insightsApi } from "@/lib/api"
import { useAppStore } from "@/store/appStore"
import InsightCard from "@/components/insights/InsightCard"
import InsightModal from "@/components/insights/InsightModal"
import { cn } from "@/lib/cn"
import type { Insight, InsightType } from "@/types"

type FilterTab = "all" | "unread" | InsightType

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "revenue_trend", label: "Revenue" },
  { id: "new_users", label: "Growth" },
  { id: "churn_signal", label: "Churn" },
]

const PAGE_SIZE = 10

export default function InsightsPage() {
  const { activeConnectionId } = useAppStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [page, setPage] = useState(1)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)

  const { data: allInsights, isLoading } = useQuery<Insight[]>({
    queryKey: ["insights", activeConnectionId, "all"],
    queryFn: () => insightsApi.list(activeConnectionId ?? undefined) as Promise<Insight[]>,
    staleTime: 60_000,
  })

  const markAllMutation = useMutation({
    mutationFn: () => insightsApi.markAllRead(activeConnectionId ?? undefined),
    onMutate: () => {
      qc.setQueriesData<Insight[]>({ queryKey: ["insights"] }, (old) =>
        old?.map((ins) => ({ ...ins, is_read: true }))
      )
    },
  })

  const filtered = (allInsights ?? []).filter((ins) => {
    if (activeTab === "unread") return !ins.is_read
    if (activeTab === "all") return true
    return ins.type === activeTab
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const unreadCount = (allInsights ?? []).filter((i) => !i.is_read).length

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab)
    setPage(1)
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-brand" />
            <h1 className="text-lg font-semibold text-[var(--text)]">Insights</h1>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-danger text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="flex items-center gap-1.5 text-xs text-[var(--text-dim)] hover:text-brand transition-colors"
            >
              <CheckCheck size={13} />
              Mark all as read
            </button>
          )}
        </div>

        <div className="flex gap-1 border-b border-[var(--border)]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "border-brand text-brand"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-dim)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 rounded-lg bg-[var(--surface-3)] animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && paged.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Sparkles size={28} className="text-[var(--text-muted)]" />
            <p className="text-sm font-medium text-[var(--text-dim)]">
              {activeTab === "unread" ? "All caught up!" : "No insights yet"}
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-xs">
              Insights are generated automatically. Check back after your database has been connected for a few hours.
            </p>
          </div>
        )}

        {!isLoading && paged.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paged.map((ins) => (
              <InsightCard key={ins.id} insight={ins} onOpenModal={setSelectedInsight} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded border border-[var(--border)] text-[var(--text-dim)] hover:bg-[var(--surface-3)] disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-[var(--text-muted)]">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs rounded border border-[var(--border)] text-[var(--text-dim)] hover:bg-[var(--surface-3)] disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <InsightModal insight={selectedInsight} onClose={() => setSelectedInsight(null)} />
    </div>
  )
}
