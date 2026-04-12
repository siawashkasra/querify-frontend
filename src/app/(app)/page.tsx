"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { RotateCcw, AlertTriangle, RefreshCw } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useAppStore } from "@/store/appStore"
import { connections, query as queryApi, insights as insightsApi } from "@/lib/api"
import { cn } from "@/lib/cn"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import { SkeletonCard, SkeletonRow, SkeletonInsightCard } from "@/components/ui/Skeleton"
import EmptyState from "@/components/ui/EmptyState"
import ConnectionCard from "@/components/connections/ConnectionCard"
import InsightCard from "@/components/insights/InsightCard"
import InsightModal from "@/components/insights/InsightModal"
import { useGreeting } from "@/hooks/useGreeting"
import { Database, Plus, MessageSquarePlus } from "lucide-react"
import type { Connection, ChatMessage, Insight } from "@/types"

const SUGGESTED_QUESTIONS = [
  "What is my revenue this month?",
  "How many new users signed up this week?",
  "Which customers are at risk of churning?",
  "Show me revenue by month for the last 6 months",
  "Who are my top 10 customers by value?",
  "What is my current churn rate?",
]

function SectionError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-surface-2 px-4 py-3 text-sm text-[var(--text-muted)]">
      <AlertTriangle size={14} className="text-warning shrink-0" />
      <span>Could not load {label}.</span>
      <button onClick={onRetry} className="flex items-center gap-1 text-xs text-brand-mid hover:underline">
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  )
}

function DegradedBanner({ name, id }: { name: string; id: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/30 px-4 py-2.5 text-sm text-warning">
      <AlertTriangle size={14} className="shrink-0" />
      <span>Your connection <strong>{name}</strong> is having trouble.</span>
      <Link href={`/settings/connections/${id}`} className="ml-auto text-xs underline hover:no-underline shrink-0">
        Check settings
      </Link>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const greeting = useGreeting()
  const { activeConnectionId, setActiveConnection } = useAppStore()
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)

  const { data: allConnections, isLoading: loadingConns, error: connsError, refetch: refetchConns } =
    useQuery<Connection[]>({
      queryKey: ["connections"],
      queryFn: () => connections.list() as Promise<Connection[]>,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    })

  const activeConn = allConnections?.find((c) => c.id === activeConnectionId) ?? allConnections?.[0] ?? null

  const { data: recentQueries, isLoading: loadingQueries, error: queriesError, refetch: refetchQueries } =
    useQuery<ChatMessage[]>({
      queryKey: ["history", "recent"],
      queryFn: () => queryApi.history({ limit: 5 }) as Promise<ChatMessage[]>,
      staleTime: 30_000,
      enabled: !!activeConn,
    })

  const { data: insights, isLoading: loadingInsights, error: insightsError, refetch: refetchInsights } =
    useQuery<Insight[]>({
      queryKey: ["insights", activeConnectionId],
      queryFn: async (): Promise<Insight[]> => {
        try { return (await insightsApi.list(activeConn?.id)) as Insight[] } catch { return [] }
      },
      staleTime: 5 * 60_000,
      enabled: !!activeConn,
    })

  const rerunMutation = useMutation({
    mutationFn: ({ messageId, connectionId }: { messageId: string; connectionId: string }) => {
      setActiveConnection(connectionId)
      return queryApi.rerun(messageId)
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["history"] })
      const r = result as { message_id: string; session_id?: string }
      router.push(r.session_id ? `/chat/${r.session_id}` : "/chat/new")
    },
  })

  const startQuestion = (q: string) => {
    if (!activeConn) return
    router.push(`/chat/new?prompt=${encodeURIComponent(q)}&connection=${activeConn.id}`)
  }

  const degradedConns = allConnections?.filter((c) => c.status === "error") ?? []
  const hasConnections = !loadingConns && (allConnections?.length ?? 0) > 0

  if (loadingConns) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-48 rounded animate-pulse bg-surface-3" />
          <div className="h-4 w-32 rounded animate-pulse bg-surface-3" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  if (!hasConnections) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={Database}
          heading="Connect your first database"
          body="Connect your database and Querify will automatically understand what your data means. Ask your first question in under 90 seconds."
          ctaLabel="Connect a database"
          onCta={() => router.push("/settings/connections/new")}
          className="max-w-sm"
        />
      </div>
    )
  }

  return (
    <>
    <div className="h-full overflow-y-auto p-6">
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {degradedConns.map((c) => <DegradedBanner key={c.id} name={c.name} id={c.id} />)}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">{greeting}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {activeConn?.status === "active" ? "Your database is ready." : "Set up a connection to get started."}
          </p>
        </div>
        <Button
          onClick={() => router.push(activeConn ? `/chat/new?connection=${activeConn.id}` : "/settings/connections/new")}
          className="shrink-0"
        >
          <MessageSquarePlus size={14} />
          Ask a question
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Connections</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allConnections!.map((c) => (
            <ConnectionCard
              key={c.id}
              connection={c}
              className={cn(c.id === activeConn?.id && "ring-1 ring-brand/40")}
            />
          ))}
          <Link
            href="/settings/connections/new"
            className="rounded-lg border border-dashed border-[var(--border)] bg-surface-2/50 p-4 flex flex-col items-center justify-center gap-2 text-sm text-[var(--text-muted)] hover:border-brand/40 hover:text-brand-mid hover:bg-surface-2 transition-colors min-h-[120px]"
          >
            <Plus size={18} />
            Add connection
          </Link>
        </div>
        {connsError && <SectionError label="connections" onRetry={refetchConns} />}
      </section>

      {activeConn && (
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Suggested questions</h3>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => startQuestion(q)}
                className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-surface-2 text-xs text-[var(--text-dim)] hover:border-brand/50 hover:text-brand-mid hover:bg-surface-3 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      )}

      {activeConn && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">From your data</h3>
            <Link href="/insights" className="text-xs text-brand hover:underline">See all insights</Link>
          </div>
          {loadingInsights ? (
            <div className="flex gap-4 overflow-x-auto pb-1">
              {[0, 1, 2].map((i) => <SkeletonInsightCard key={i} />)}
            </div>
          ) : insightsError ? (
            <SectionError label="insights" onRetry={refetchInsights} />
          ) : !insights?.length ? (
            <p className="text-xs text-[var(--text-muted)]">
              Insights are generated automatically. Check back after your database has been connected for a few hours.
            </p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1">
              {insights.slice(0, 3).map((ins) => (
                <InsightCard key={ins.id} insight={ins} onOpenModal={setSelectedInsight} compact />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Recent questions</h3>
        {loadingQueries ? (
          <div className="flex flex-col">
            {[0, 1, 2, 4].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : queriesError ? (
          <SectionError label="recent queries" onRetry={refetchQueries} />
        ) : !recentQueries?.length ? (
          <p className="text-xs text-[var(--text-muted)] py-4">No queries yet. Ask your first question.</p>
        ) : (
          <div className="rounded-lg border border-[var(--border)] bg-surface-2 overflow-hidden">
            {recentQueries.map((msg, i) => (
              <div
                key={msg.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  i < recentQueries.length - 1 && "border-b border-[var(--border)]"
                )}
              >
                <p className="flex-1 text-sm text-[var(--text)] truncate min-w-0">
                  {msg.prompt.slice(0, 80)}{msg.prompt.length > 80 ? "…" : ""}
                </p>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={msg.status === "success" ? "active" : msg.status === "failed" ? "degraded" : "pending"}>
                    {msg.status}
                  </Badge>
                  <span className="text-xs text-[var(--text-muted)] hidden sm:block w-20 text-right">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                  {msg.execution_ms && (
                    <span className="text-xs font-mono text-[var(--text-muted)] hidden md:block w-14 text-right">
                      {msg.execution_ms}ms
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={rerunMutation.isPending}
                    onClick={() => rerunMutation.mutate({ messageId: msg.id, connectionId: activeConn?.id ?? "" })}
                    className="shrink-0"
                  >
                    <RotateCcw size={11} />
                    Ask again
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
    </div>

    <InsightModal insight={selectedInsight} onClose={() => setSelectedInsight(null)} />
    </>
  )
}
