"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { RefreshCw, Database, ArrowRight, Sparkles, AlertTriangle, TrendingUp, TrendingDown, Circle, Lightbulb } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/appStore"
import { connections as connectionsApi, dashboard as dashboardApi } from "@/lib/api"
import { cn } from "@/lib/cn"
import Button from "@/components/ui/Button"
import EmptyState from "@/components/ui/EmptyState"
import CanDo from "@/components/auth/CanDo"
import BriefingKpiCard from "@/components/dashboard/BriefingKpiCard"
import ForecastSection from "@/components/dashboard/ForecastSection"
import { useGreeting } from "@/hooks/useGreeting"
import type { Connection, BriefingData, BriefingDrivers, BriefingPattern, BriefingPriority } from "@/types"

// U8 — every inline figure in briefing prose renders in mono with the verified
// trust underline (the briefing is built on the confirmed model).
const NUM_RE = /(\$[\d,]+(?:\.\d+)?[KMBkmb]?|\d+(?:\.\d+)?%|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g
function trustNumbers(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(NUM_RE)) {
    if (m.index! > last) parts.push(text.slice(last, m.index!))
    parts.push(<span key={m.index} className="num-verified">{m[0]}</span>)
    last = m.index! + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function PriorityRow({ p, onExplore }: { p: BriefingPriority; onExplore: (q: string) => void }) {
  const Icon = p.direction === "risk" ? AlertTriangle : p.direction === "positive" ? TrendingUp : Circle
  const tone = p.direction === "risk" ? "text-caution" : p.direction === "positive" ? "text-verify" : "text-ink-dim"
  return (
    <div className="flex items-start gap-3 py-3.5">
      <Icon size={16} className={cn("mt-0.5 shrink-0", tone)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{p.title}</p>
        <p className="mt-0.5 text-sm leading-[1.55] text-ink-dim">{p.detail}</p>
      </div>
      <button onClick={() => onExplore(p.explore_question)}
        className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-dim hover:border-violet hover:text-violet transition-colors">
        {p.deep_link_label}
      </button>
    </div>
  )
}

// TASK 3 — the value layer: what moved the top measure, and what dragged it.
function DriversSection({ drivers, onExplore }: { drivers: BriefingDrivers; onExplore: (q: string) => void }) {
  const rows = [
    ...drivers.gainers.map((g) => ({ ...g, up: true })),
    ...drivers.drags.map((d) => ({ ...d, up: false })),
  ]
  return (
    <section className="rounded-xl border border-line bg-surface px-6 py-5">
      <h2 className="text-sm font-semibold text-ink">What moved {drivers.measure}</h2>
      <p className="mt-0.5 text-xs text-ink-dim">{drivers.window}, by {drivers.dimension.replace(/_/g, " ")}</p>
      <p className="mt-3 text-sm leading-[1.6] text-ink-dim">{trustNumbers(drivers.text)}</p>
      {rows.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rows.map((r, i) => (
            <button key={i} onClick={() => onExplore(`Why did ${drivers.measure} for ${r.segment} change over the last 30 days?`)}
              className="group flex items-center gap-2.5 rounded-lg border border-line bg-paper px-3 py-2.5 text-left hover:border-violet/40 transition-colors">
              {r.up ? <TrendingUp size={14} className="shrink-0 text-verify" /> : <TrendingDown size={14} className="shrink-0 text-alert" />}
              <span className="flex-1 truncate text-sm text-ink-dim">{r.segment}</span>
              <span className={cn("font-data tabular-nums text-sm font-semibold", r.up ? "text-verify" : "text-alert")}>{r.formatted}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

// Named, quality-gated patterns from the discovery engine — or nothing at all.
// TASK 4 — each pattern states itself ONCE: the support line only renders when it
// genuinely differs from the headline (no headline/summary echo).
function PatternsSection({ patterns, onExplore }: { patterns: BriefingPattern[]; onExplore: (q: string) => void }) {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[.\s]+$/, "")
  return (
    <section className="rounded-card border border-line bg-surface shadow-rest px-6 py-5">
      <h2 className="text-[11px] font-medium uppercase tracking-wide text-ink-dim">Patterns in your data</h2>
      <div className="mt-2 divide-y divide-line">
        {patterns.map((p, i) => {
          const showSummary = p.summary && norm(p.summary) !== norm(p.headline)
          return (
            <div key={i} className="flex items-start gap-3 py-3.5">
              <Lightbulb size={15} className="mt-0.5 shrink-0 text-violet" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-ink leading-snug">{trustNumbers(p.headline)}</p>
                {showSummary && <p className="mt-1 text-[13px] leading-[1.55] text-ink-dim">{trustNumbers(p.summary)}</p>}
              </div>
              <Button variant="secondary" size="sm" onClick={() => onExplore(p.headline)}>Explore</Button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function BriefingSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-32 rounded-card shimmer" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[150px] rounded-card shimmer" />)}</div>
      <div className="h-40 rounded-card shimmer" />
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const greeting = useGreeting()
  const { activeConnectionId, setActiveConnection } = useAppStore()
  const [question, setQuestion] = useState("")

  const { data: allConnections, isLoading: loadingConns } = useQuery<Connection[]>({
    queryKey: ["connections"], queryFn: () => connectionsApi.list() as Promise<Connection[]>, staleTime: 30_000,
  })
  const activeConn = allConnections?.find((c) => c.id === activeConnectionId) ?? allConnections?.[0] ?? null

  const { data: brief, isLoading: loadingBrief, isFetching } = useQuery<BriefingData>({
    queryKey: ["briefing", activeConn?.id],
    queryFn: () => dashboardApi.briefing(activeConn!.id) as Promise<BriefingData>,
    enabled: !!activeConn, staleTime: 5 * 60_000,
  })

  const refreshMut = useMutation({
    mutationFn: () => dashboardApi.refreshBriefing(activeConn!.id),
    onSuccess: (d) => qc.setQueryData(["briefing", activeConn?.id], d),
  })

  // FIX 1 — stale-model trap: re-run the verification pipeline.
  const reverifyMut = useMutation({
    mutationFn: () => connectionsApi.retryPipeline(activeConn!.id),
  })

  const ask = (q?: string) => {
    if (!activeConn) return
    const text = (q ?? question).trim()
    router.push(`/chat/new?connection=${activeConn.id}${text ? `&prompt=${encodeURIComponent(text)}` : ""}`)
  }

  const visibleKpis = useMemo(() => (brief?.kpis ?? []).filter((k) => k.status === "ok" || k.formatted !== "—"), [brief])

  if (loadingConns) return <div className="h-full overflow-y-auto p-6"><div className="max-w-[1200px] mx-auto"><BriefingSkeleton /></div></div>

  if (!activeConn) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh] p-6">
        <CanDo permission="connections:create"
          fallback={<EmptyState icon={Database} heading="No database connected yet" body="Ask your workspace admin to connect a database." className="max-w-sm" />}>
          <EmptyState icon={Database} heading="Connect your database to get started"
            body="Querify will build a daily business briefing from your data." ctaLabel="Connect a database"
            onCta={() => router.push("/settings/connections/new")} className="max-w-sm" />
        </CanDo>
      </div>
    )
  }

  const noDefinition = !!brief && brief.status === "no_definition"
  const needsReverify = !!brief && brief.status === "needs_reverification"

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex flex-col gap-8 max-w-[1200px] mx-auto">

        {/* SECTION A — briefing header */}
        <div className="rounded-xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.01em] text-ink">{greeting}</h1>
              {brief?.greeting_summary && <p className="mt-1 text-[13px] text-ink-dim">{brief.greeting_summary}</p>}
            </div>
            <div className="flex items-center gap-3 text-xs text-ink-dim">
              {(allConnections?.length ?? 0) > 1 && (
                <select value={activeConn.id} onChange={(e) => setActiveConnection(e.target.value)}
                  className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink">
                  {allConnections!.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              {brief?.resolved_at && <span>Updated {formatDistanceToNow(new Date(brief.resolved_at), { addSuffix: true })}</span>}
              <button onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending || isFetching}
                className="flex items-center gap-1 rounded-md px-2 py-1 hover:text-violet hover:bg-paper transition-colors">
                <RefreshCw size={13} className={cn((refreshMut.isPending || isFetching) && "animate-spin")} /> Refresh
              </button>
            </div>
          </div>
          {brief?.headline_paragraph && (
            <p className="mt-4 text-[15px] leading-[1.7] text-ink max-w-[72ch]">{trustNumbers(brief.headline_paragraph)}</p>
          )}
        </div>

        {/* SECTION D — ask a question */}
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 focus-within:border-violet/50 transition-colors">
          <Sparkles size={16} className="text-violet shrink-0" />
          <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ask anything about your data…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-dim" />
          <Button size="sm" onClick={() => ask()}>Ask <ArrowRight size={13} /></Button>
        </div>

        {loadingBrief && !brief ? (
          <BriefingSkeleton />
        ) : needsReverify ? (
          <EmptyState icon={AlertTriangle}
            heading="This connection needs re-verification"
            body="Querify's schema understanding was upgraded since this connection's model was built. Re-verify to refresh how your measures are defined — until then the briefing is paused so it never shows numbers from the older model."
            ctaLabel={reverifyMut.isSuccess ? "Re-verification started" : "Re-verify connection"}
            onCta={() => reverifyMut.mutate()} className="max-w-md" />
        ) : noDefinition ? (
          <EmptyState icon={Database} heading="Your briefing is still being set up"
            body="We haven't found business metrics for this connection yet. Ask a question above to explore your data, or check back in a moment."
            ctaLabel="Refresh" onCta={() => refreshMut.mutate()} className="max-w-md" />
        ) : (
          <>
            {/* SECTION B — KPI grid */}
            {visibleKpis.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {visibleKpis.map((k) => <BriefingKpiCard key={k.id} kpi={k} onExplore={(q) => ask(q)} />)}
              </div>
            )}

            {/* TASK 3 — needs-verification tiles: caution left rule, honest reason,
                a Re-verify ghost button. Sits AFTER healthy KPIs, never a fake KPI. */}
            {!!brief?.needs_verification?.length && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {brief.needs_verification.map((nv, i) => (
                  <div key={i} className="rounded-card border border-line border-l-2 border-l-caution bg-surface shadow-rest px-3.5 py-3">
                    <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                      <span className="truncate">{nv.label}</span>
                      <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-caution">Needs verification</span>
                    </div>
                    <p className="mt-1 text-xs leading-snug text-ink-dim">{nv.reason}</p>
                    <button
                      onClick={() => reverifyMut.mutate()}
                      disabled={reverifyMut.isPending}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-ink-dim hover:text-violet transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={11} className={cn(reverifyMut.isPending && "animate-spin")} />
                      {reverifyMut.isSuccess ? "Re-verification started" : "Re-verify"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* SECTION B2 — the value layer: forecast + drivers + named patterns */}
            {brief?.forecast && <ForecastSection forecast={brief.forecast} />}
            {brief?.drivers && <DriversSection drivers={brief.drivers} onExplore={(q) => ask(q)} />}
            {!!brief?.patterns?.length && <PatternsSection patterns={brief.patterns} onExplore={(q) => ask(q)} />}

            {/* SECTION C — today's priorities */}
            <section className="rounded-xl border border-line bg-surface px-6 py-5">
              <h2 className="text-sm font-semibold text-ink">Today&apos;s Priorities</h2>
              {brief && brief.priorities.length > 0 ? (
                <div className="mt-1 divide-y divide-line">
                  {brief.priorities.map((p, i) => <PriorityRow key={i} p={p} onExplore={(q) => ask(q)} />)}
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-dim">No urgent items today — your business is running steady.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
