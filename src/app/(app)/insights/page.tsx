"use client"

import { useEffect, useRef, useState } from "react"
import { redirect } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Sparkles, CheckCheck } from "lucide-react"
import toast from "react-hot-toast"
import { INSIGHTS_ENABLED } from "@/lib/featureFlags"
import { connections as connectionsApi, insights as insightsApi } from "@/lib/api"
import { useAppStore } from "@/store/appStore"
import { usePlan } from "@/hooks/usePlan"
import InsightCard, { InsightCardSkeleton } from "@/components/insights/InsightCard"
import PremiumInsightCard from "@/components/insights/PremiumInsightCard"
import InsightModal from "@/components/insights/InsightModal"
import { UpgradePromptInline, LockedFeatureOverlay } from "@/components/billing/UpgradePrompt"
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
  // Insights folded into the dashboard for now. Anyone with a bookmarked /insights
  // URL is sent home. The page component below stays intact — flip
  // NEXT_PUBLIC_INSIGHTS_ENABLED=true to restore it. (INSIGHTS_ENABLED is a
  // build-time constant, so the hook order below is stable.)
  if (!INSIGHTS_ENABLED) redirect("/dashboard")

  const { activeConnectionId } = useAppStore()
  const qc = useQueryClient()
  const { canInsights } = usePlan()
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [page, setPage] = useState(1)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const prevGenerationState = useRef<string | null>(null)

  const { data: allInsights, isLoading } = useQuery<Insight[]>({
    queryKey: ["insights", activeConnectionId, "all"],
    queryFn: () => insightsApi.list(activeConnectionId ?? undefined) as Promise<Insight[]>,
    staleTime: 60_000,
  })
  const { data: generationStatus } = useQuery({
    queryKey: ["insight-generation-status", activeConnectionId],
    queryFn: () => {
      if (!activeConnectionId) throw new Error("No active connection selected")
      return connectionsApi.insightGenerationStatus(activeConnectionId)
    },
    enabled: !!activeConnectionId,
    refetchInterval: (query) => {
      const state = query.state.data?.state
      return state === "queued" || state === "running" ? 2000 : false
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () => insightsApi.markAllRead(activeConnectionId ?? undefined),
    onMutate: () => {
      qc.setQueriesData<Insight[]>({ queryKey: ["insights"] }, (old) =>
        old?.map((ins) => ({ ...ins, is_read: true }))
      )
    },
  })
  const discoverMutation = useMutation({
    mutationFn: () => {
      if (!activeConnectionId) throw new Error("No active connection selected")
      return insightsApi.discover(activeConnectionId)
    },
    onSuccess: async (data) => {
      const n = (data as { discovered: number })?.discovered ?? 0
      toast.success(n > 0 ? `Discovered ${n} premium insight${n === 1 ? "" : "s"}` : "No standout patterns right now")
      await qc.invalidateQueries({ queryKey: ["insights"] })
    },
    onError: () => toast.error("Discovery failed"),
  })
  const triggerInsightsMutation = useMutation({
    mutationFn: () => {
      if (!activeConnectionId) throw new Error("No active connection selected")
      return connectionsApi.generateInsights(activeConnectionId)
    },
    onSuccess: async (data) => {
      toast.success("Insight generation queued")
      setShowProgress(true)
      await qc.invalidateQueries({ queryKey: ["insights", activeConnectionId, "all"] })
      await qc.invalidateQueries({ queryKey: ["insight-generation-status", activeConnectionId] })
      window.setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["insights", activeConnectionId, "all"] })
      }, Math.max((data?.estimated_completion_seconds ?? 45) * 1000, 15000))
    },
    onError: (error: { status?: number; message?: string }) => {
      if (error?.status === 429) {
        toast.error(error.message || "You can trigger insight generation every 30 minutes.")
        return
      }
      toast.error(error?.message || "Failed to trigger insight generation")
    },
  })
  const generationInProgress = generationStatus?.state === "queued" || generationStatus?.state === "running"
  const generationDone = generationStatus?.state === "completed"
  const generationFailed = generationStatus?.state === "failed"
  useEffect(() => {
    const state = generationStatus?.state
    const prev = prevGenerationState.current
    if (state === "completed" && prev !== "completed") {
      qc.invalidateQueries({ queryKey: ["insights", activeConnectionId, "all"] })
      const generated = generationStatus?.generated ?? 0
      if (generated > 0) {
        toast.success(`${generated} insight${generated === 1 ? "" : "s"} ready`)
      } else {
        toast("No new insights generated for this run.")
      }
    }
    if (state === "failed" && prev !== "failed") {
      toast.error(generationStatus?.message || "Insight generation failed.")
    }
    if (state) {
      prevGenerationState.current = state
    }
  }, [generationStatus?.state, generationStatus?.generated, generationStatus?.message, activeConnectionId, qc])

  const isDiscovered = (ins: Insight) => !!(ins.data_snapshot as Record<string, unknown> | null)?.pattern

  // Discovery runs automatically — no button. The first time a connection has no
  // discovered insights, kick off discovery once in the background.
  const autoDiscovered = useRef<string | null>(null)
  useEffect(() => {
    if (!activeConnectionId || isLoading || !allInsights) return
    if (autoDiscovered.current === activeConnectionId) return
    const hasDiscovered = allInsights.some((i) => !!(i.data_snapshot as Record<string, unknown> | null)?.pattern)
    if (!hasDiscovered && !discoverMutation.isPending) {
      autoDiscovered.current = activeConnectionId
      discoverMutation.mutate()
    }
  }, [activeConnectionId, isLoading, allInsights, discoverMutation])

  // 'Worth your attention' — high-priority discovered insights pinned to the top.
  const pinned = (allInsights ?? []).filter((i) => i.is_urgent && isDiscovered(i)).slice(0, 3)
  const pinnedIds = new Set(pinned.map((i) => i.id))

  const filtered = (allInsights ?? []).filter((ins) => {
    if (pinnedIds.has(ins.id)) return false
    if (activeTab === "unread") return !ins.is_read
    if (activeTab === "all") return true
    return ins.type === activeTab
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const refetchInsights = () => qc.invalidateQueries({ queryKey: ["insights"] })
  const unreadCount = (allInsights ?? []).filter((i) => !i.is_read).length

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab)
    setPage(1)
  }

  if (!canInsights) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-brand" />
            <h1 className="text-lg font-semibold text-[var(--text)]">Insights</h1>
          </div>
          <UpgradePromptInline
            feature="Automatic insights"
            plan="Starter"
            price={29}
          />
          {/* Preview: blurred skeleton cards */}
          <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pointer-events-none select-none opacity-40 blur-sm">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] bg-white p-4 h-40 flex flex-col gap-2">
                  <div className="h-3 bg-[var(--surface-3)] rounded w-2/3" />
                  <div className="h-3 bg-[var(--surface-3)] rounded w-full" />
                  <div className="h-3 bg-[var(--surface-3)] rounded w-4/5" />
                </div>
              ))}
            </div>
            <LockedFeatureOverlay feature="Automatic insights" plan="Starter" price={29} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-[720px] mx-auto flex flex-col gap-6">
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
          <div className="flex items-center gap-3">
            {discoverMutation.isPending && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Sparkles size={12} className="text-brand animate-pulse" /> Analysing your data…
              </span>
            )}
            {!generationInProgress && (
              <button onClick={() => triggerInsightsMutation.mutate()} disabled={!activeConnectionId || triggerInsightsMutation.isPending} className="px-3 py-1.5 text-xs rounded-md bg-brand text-white hover:bg-brand-dark disabled:opacity-50 transition-colors">
                {triggerInsightsMutation.isPending ? "Generating..." : "Generate Insights Now"}
              </button>
            )}
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
        </div>
        {(showProgress || generationInProgress || generationDone || generationFailed) && (
          <div className="rounded-lg border border-[var(--border)] bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-dim)]">{generationStatus?.message || (triggerInsightsMutation.isPending ? "Queueing insight generation..." : "Waiting for status...")}</p>
              <span className="text-xs font-medium text-[var(--text-muted)]">{Math.max(0, Math.min(100, generationStatus?.progress_pct ?? (triggerInsightsMutation.isPending ? 10 : 0)))}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div className={cn("h-2 rounded-full transition-all duration-500", generationFailed ? "bg-danger" : generationDone ? "bg-success" : "bg-brand")} style={{ width: `${Math.max(6, Math.min(100, generationStatus?.progress_pct ?? (triggerInsightsMutation.isPending ? 10 : 0)))}%` }} />
            </div>
            {generationDone && (
              <p className="mt-2 text-xs text-success">Your insights are ready.</p>
            )}
            {generationFailed && (
              <p className="mt-2 text-xs text-danger">Insight generation failed. Try again.</p>
            )}
          </div>
        )}

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
          <div className="flex flex-col gap-6">
            {[0, 1, 2].map((i) => (
              <InsightCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && paged.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Sparkles size={28} className="text-[var(--text-muted)]" />
            <p className="text-sm font-medium text-[#374151]">
              {activeTab === "unread" ? "All caught up" : "No standout patterns in your data today."}
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm">
              {activeTab === "unread"
                ? "You've seen everything."
                : "We continuously analyse your business and will surface anything important here."}
            </p>
            {!generationInProgress && (
              <button onClick={() => triggerInsightsMutation.mutate()} disabled={!activeConnectionId || triggerInsightsMutation.isPending} className="mt-2 px-3 py-1.5 text-xs rounded-md bg-brand text-white hover:bg-brand-dark disabled:opacity-50 transition-colors">
                {triggerInsightsMutation.isPending ? "Generating..." : "Generate Insights Now"}
              </button>
            )}
          </div>
        )}

        {!isLoading && pinned.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Worth your attention</h2>
            <div className="flex flex-col gap-6">
              {pinned.map((ins) => (
                <PremiumInsightCard key={ins.id} insight={ins} onChanged={refetchInsights} />
              ))}
            </div>
          </section>
        )}

        {!isLoading && paged.length > 0 && (
          <div className="flex flex-col gap-6">
            {paged.map((ins) => (
              isDiscovered(ins)
                ? <PremiumInsightCard key={ins.id} insight={ins} onChanged={refetchInsights} />
                : <InsightCard key={ins.id} insight={ins} onOpenModal={setSelectedInsight} />
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
