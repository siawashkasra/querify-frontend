"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { RefreshCw, Database, ArrowRight, TrendingUp, TrendingDown, X, Sparkles } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/appStore"
import { connections as connectionsApi, dashboard as dashboardApi, insights as insightsApi } from "@/lib/api"
import { cn } from "@/lib/cn"
import Button from "@/components/ui/Button"
import EmptyState from "@/components/ui/EmptyState"
import CanDo from "@/components/auth/CanDo"
import KpiTile from "@/components/dashboard/KpiTile"
import QueryChart from "@/components/chat/QueryChart"
import InsightCard from "@/components/insights/InsightCard"
import InsightModal from "@/components/insights/InsightModal"
import { useGreeting } from "@/hooks/useGreeting"
import type { Connection, DashboardData, DashboardChartTile, Insight } from "@/types"

function rowsToObjects(columns: string[], rows: unknown[][]): Record<string, unknown>[] {
  return rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, (r as unknown[])[i] ?? null])))
}

// ── what-changed strip ────────────────────────────────────────────────────────
function WhatChanged({ data }: { data: DashboardData }) {
  if (!data.changes.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mr-1">Since yesterday</span>
      {data.changes.map((c) => {
        const tone = c.is_good === null ? "neutral" : c.is_good ? "good" : "bad"
        const Arrow = c.direction === "up" ? TrendingUp : TrendingDown
        return (
          <span key={c.id} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
            tone === "good" && "border-success/30 bg-success/5 text-success",
            tone === "bad" && "border-danger/30 bg-danger/5 text-danger",
            tone === "neutral" && "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-dim)]")}>
            <Arrow size={12} />
            {c.text}
          </span>
        )
      })}
    </div>
  )
}

// ── chart card with hide (lightweight customisation) ──────────────────────────
function ChartCard({ tile, onHide }: { tile: DashboardChartTile; onHide?: (id: string) => void }) {
  const rows = useMemo(() => rowsToObjects(tile.columns, tile.rows as unknown[][]), [tile.columns, tile.rows])
  return (
    <div className="group relative flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-white p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--text)]">{tile.title}</h4>
        {onHide && (
          <button onClick={() => onHide(tile.id)} title="Hide this chart"
            className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-danger transition-all">
            <X size={14} />
          </button>
        )}
      </div>
      {tile.status === "ok" && rows.length >= 1
        ? <QueryChart config={tile.config} rows={rows} />
        : <div className="h-[200px] flex items-center justify-center text-xs text-[var(--text-muted)]">{tile.status === "ok" ? "No data" : "Loading…"}</div>}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="h-7 w-56 rounded bg-surface-3" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[120px] rounded-xl bg-surface-3" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[0, 1].map((i) => <div key={i} className="h-[260px] rounded-xl bg-surface-3" />)}</div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const greeting = useGreeting()
  const { activeConnectionId, setActiveConnection } = useAppStore()
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const [question, setQuestion] = useState("")

  const { data: allConnections, isLoading: loadingConns } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list() as Promise<Connection[]>,
    staleTime: 30_000,
  })
  const activeConn = allConnections?.find((c) => c.id === activeConnectionId) ?? allConnections?.[0] ?? null

  const { data: dash, isLoading: loadingDash, isFetching } = useQuery<DashboardData>({
    queryKey: ["dashboard", activeConn?.id],
    queryFn: () => dashboardApi.get(activeConn!.id) as Promise<DashboardData>,
    enabled: !!activeConn,
    staleTime: 5 * 60_000,
  })

  const { data: insights } = useQuery<Insight[]>({
    queryKey: ["insights", activeConn?.id],
    queryFn: async () => { try { return (await insightsApi.list(activeConn?.id)) as Insight[] } catch { return [] } },
    enabled: !!activeConn,
    staleTime: 5 * 60_000,
  })

  const refreshMut = useMutation({
    mutationFn: () => dashboardApi.refresh(activeConn!.id),
    onSuccess: (d) => qc.setQueryData(["dashboard", activeConn?.id], d),
  })

  const hideMut = useMutation({
    mutationFn: (chartId: string) => {
      const hidden = (dash?.charts ?? []).filter((c) => c.id === chartId).map((c) => c.id)
      return dashboardApi.customise(activeConn!.id, { hidden_charts: hidden })
    },
    onSuccess: () => { refreshMut.mutate() },
  })

  const ask = () => {
    if (!activeConn) return
    const q = question.trim()
    router.push(`/chat/new?connection=${activeConn.id}${q ? `&prompt=${encodeURIComponent(q)}` : ""}`)
  }

  if (loadingConns) return <div className="h-full overflow-y-auto p-6"><div className="max-w-6xl mx-auto"><DashboardSkeleton /></div></div>

  if (!activeConn) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh] p-6">
        <CanDo permission="connections:create"
          fallback={<EmptyState icon={Database} heading="No database connected yet" body="Ask your workspace admin to connect a database." className="max-w-sm" />}>
          <EmptyState icon={Database} heading="Connect your database to get started"
            body="Querify will automatically build a dashboard of the metrics that matter for your business."
            ctaLabel="Connect a database" onCta={() => router.push("/settings/connections/new")} className="max-w-sm" />
        </CanDo>
      </div>
    )
  }

  const needsAttention = (insights ?? []).filter((i) => i.is_urgent).slice(0, 3)
  const building = dash?.status === "no_definition"

  return (
    <>
      <div className="h-full overflow-y-auto p-6">
        <div className="flex flex-col gap-8 max-w-6xl mx-auto">

          {/* A) greeting + context bar */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text)]">{greeting}</h2>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                Your business at a glance{dash?.business_type && dash.business_type !== "other" ? ` · ${dash.business_type}` : ""}.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {(allConnections?.length ?? 0) > 1 && (
                <select value={activeConn.id} onChange={(e) => setActiveConnection(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[var(--text)]">
                  {allConnections!.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                {dash?.resolved_at && <span>Updated {formatDistanceToNow(new Date(dash.resolved_at), { addSuffix: true })}</span>}
                <button onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending || isFetching}
                  className="flex items-center gap-1 rounded-md px-2 py-1 hover:text-brand hover:bg-[var(--surface-2)] transition-colors">
                  <RefreshCw size={13} className={cn((refreshMut.isPending || isFetching) && "animate-spin")} /> Refresh
                </button>
              </div>
            </div>
          </div>

          {/* F) ask a question (prominent, top) */}
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 focus-within:border-brand/50 transition-colors">
            <Sparkles size={16} className="text-brand shrink-0" />
            <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder="Ask anything about your data…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]" />
            <Button size="sm" onClick={ask}>Ask <ArrowRight size={13} /></Button>
          </div>

          {building ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
                <RefreshCw size={14} className="animate-spin text-brand" /> Building your dashboard…
              </div>
              <DashboardSkeleton />
            </div>
          ) : loadingDash ? (
            <DashboardSkeleton />
          ) : (
            <>
              {/* B) north-star metrics */}
              {!!dash?.kpis.length && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {dash.kpis.map((k) => <KpiTile key={k.id} kpi={k} />)}
                </div>
              )}

              {/* C) what changed */}
              {dash && <WhatChanged data={dash} />}

              {/* E) needs attention */}
              {needsAttention.length > 0 && (
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Needs attention</h3>
                    <Link href="/insights" className="text-xs text-brand hover:underline">See all insights →</Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {needsAttention.map((ins) => <InsightCard key={ins.id} insight={ins} onOpenModal={setSelectedInsight} compact />)}
                  </div>
                </section>
              )}

              {/* D) primary charts grid */}
              {!!dash?.charts.length && (
                <section className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Your key charts</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {dash.charts.map((tile) => (
                      <ChartCard key={tile.id} tile={tile} onHide={(id) => hideMut.mutate(id)} />
                    ))}
                  </div>
                </section>
              )}

              {dash?.status === "ok" && !dash.kpis.length && !dash.charts.length && (
                <EmptyState icon={Database} heading="No metrics yet"
                  body="We could not build metrics for this connection automatically. Try asking a question to explore your data."
                  className="max-w-md" />
              )}
            </>
          )}
        </div>
      </div>
      <InsightModal insight={selectedInsight} onClose={() => setSelectedInsight(null)} />
    </>
  )
}
