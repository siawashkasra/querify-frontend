"use client"

import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow, format } from "date-fns"
import {
  TrendingUp, TrendingDown, Minus, Database,
  FileDown, Clock, Users, Zap, ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { billing as billingApi, tenant as tenantApi } from "@/lib/api"
import { usePlan } from "@/hooks/usePlan"
import Spinner from "@/components/ui/Spinner"
import { cn } from "@/lib/cn"
import type { ExtendedUsage, MemberStat, SuccessRateSummary, Member } from "@/lib/api"

// ── Plan ordering for "next plan up" ──────────────────────────────────────────

const NEXT_PLAN: Record<string, string> = {
  free: "starter",
  starter: "pro",
  pro: "team",
}
const NEXT_PRICE: Record<string, number> = {
  free: 29,
  starter: 79,
  pro: 199,
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function pct(used: number, limit: number | null) {
  if (!limit) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function barColor(p: number) {
  if (p >= 90) return "bg-danger"
  if (p >= 70) return "bg-warning"
  return "bg-success"
}

function textColor(p: number) {
  if (p >= 90) return "text-danger"
  if (p >= 70) return "text-warning"
  return "text-success"
}

// ── Mini usage bar ─────────────────────────────────────────────────────────────

function MiniBar({
  used, limit, className,
}: { used: number; limit: number | null; className?: string }) {
  const p = pct(used, limit)
  return (
    <div className={cn("h-1.5 rounded-full bg-surface-2 overflow-hidden w-24", className)}>
      <div
        className={cn("h-full rounded-full transition-all", barColor(p))}
        style={{ width: `${p}%` }}
      />
    </div>
  )
}

// ── Limit card ────────────────────────────────────────────────────────────────

function LimitCard({
  icon: Icon,
  label,
  used,
  limit,
  unit,
  limitLabel,
  planName,
}: {
  icon: React.ElementType
  label: string
  used: number
  limit: number | null
  unit?: string
  limitLabel?: string
  planName: string
}) {
  const p = pct(used, limit)
  const isWarning = p >= 80
  const nextPlan = NEXT_PLAN[planName]
  const nextPrice = NEXT_PRICE[planName]

  return (
    <div className={cn(
      "bg-surface rounded-xl border p-4 flex flex-col gap-3",
      isWarning ? "border-amber-200" : "border-[var(--border)]"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-surface-2 border border-[var(--border)] flex items-center justify-center">
            <Icon size={13} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-xs font-semibold text-[var(--text-dim)]">{label}</p>
        </div>
        {limit !== null && (
          <p className={cn("text-xs font-medium tabular-nums", isWarning ? "text-amber-600" : "text-[var(--text-muted)]")}>
            {used} / {limitLabel ?? limit} {unit}
          </p>
        )}
      </div>

      {limit !== null ? (
        <>
          <MiniBar used={used} limit={limit} className="w-full" />
          {isWarning && nextPlan && (
            <Link
              href={`/org/billing?plan=${nextPlan}`}
              className="flex items-center gap-1 text-[11px] text-amber-600 hover:underline"
            >
              <Zap size={10} /> Upgrade to {nextPlan} — ${nextPrice}/mo
              <ArrowRight size={10} />
            </Link>
          )}
        </>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">{limitLabel ?? `${used} ${unit ?? ""}`}</p>
      )}
    </div>
  )
}

// ── Success rate widget ────────────────────────────────────────────────────────

function SuccessRateWidget({ data }: { data: SuccessRateSummary }) {
  const delta = data.this_month_pct - data.last_month_pct
  const improved = delta > 0
  const declined = delta < 0

  return (
    <div className="bg-surface rounded-xl border border-[var(--border)] p-5 flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Query success rate
      </p>
      <div className="flex items-end gap-6">
        <div>
          <p className={cn(
            "text-3xl font-bold tabular-nums",
            data.this_month_pct >= 90 ? "text-success"
            : data.this_month_pct >= 70 ? "text-warning"
            : "text-danger"
          )}>
            {data.this_month_pct.toFixed(1)}%
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            This month · {data.total_queries_this_month.toLocaleString()} queries
          </p>
        </div>
        <div className="pb-1">
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded",
            improved ? "text-success bg-success/10"
            : declined ? "text-danger bg-danger/10"
            : "text-[var(--text-muted)] bg-surface-2"
          )}>
            {improved ? <TrendingUp size={12} />
            : declined ? <TrendingDown size={12} />
            : <Minus size={12} />}
            {Math.abs(delta).toFixed(1)}pp {improved ? "up" : declined ? "down" : ""}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            vs {data.last_month_pct.toFixed(1)}% last month
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrgUsagePage() {
  const { planName, isLoading: planLoading } = usePlan()

  const { data: usage, isLoading: usageLoading } = useQuery<ExtendedUsage>({
    queryKey: ["extended-usage"],
    queryFn: () => billingApi.extendedUsage() as Promise<ExtendedUsage>,
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  })

  const { data: memberUsage, isLoading: memberUsageLoading } = useQuery<MemberStat[]>({
    queryKey: ["member-usage"],
    queryFn: () => billingApi.memberUsage() as Promise<MemberStat[]>,
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  })

  const { data: successRate } = useQuery<SuccessRateSummary>({
    queryKey: ["success-rate"],
    queryFn: () => billingApi.successRate() as Promise<SuccessRateSummary>,
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  })

  const { data: members } = useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: () => tenantApi.members() as Promise<Member[]>,
    staleTime: 5 * 60_000,
  })

  const isLoading = usageLoading || planLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="md" />
      </div>
    )
  }

  const queriesUsed = usage?.queries_used ?? 0
  const queryLimit = usage?.query_limit ?? null
  const queryPct = pct(queriesUsed, queryLimit)
  const showUpgradeBanner = queryLimit !== null && queryPct >= 80
  const nextPlan = NEXT_PLAN[planName]
  const nextPrice = NEXT_PRICE[planName]

  // Billing cycle
  const periodStart = usage?.period_start ?? null
  const periodEnd = usage?.period_end ?? null
  const daysRemaining = usage?.days_remaining ?? 0

  // Member usage with member names
  const memberMap = new Map((members ?? []).map((m) => [m.user_id, m]))
  const sortedMemberUsage = [...(memberUsage ?? [])].sort(
    (a, b) => b.queries_this_month - a.queries_this_month
  )
  const totalMemberQueries = sortedMemberUsage.reduce((s, m) => s + m.queries_this_month, 0)

  return (
    <div className="flex flex-col gap-8">
      {/* Billing cycle strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 rounded-xl border border-[var(--border)] bg-surface-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Billing period
          </p>
          <p className="text-sm text-[var(--text)] mt-0.5">
            {periodStart ? format(new Date(periodStart), "MMM d") : "—"}
            {" – "}
            {periodEnd ? format(new Date(periodEnd), "MMM d, yyyy") : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Days remaining
          </p>
          <p className={cn(
            "text-sm font-semibold mt-0.5 tabular-nums",
            daysRemaining <= 5 ? "text-warning" : "text-[var(--text)]"
          )}>
            {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="ml-auto">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-[var(--border)] text-[var(--text-muted)] capitalize">
            {planName} plan
          </span>
        </div>
      </div>

      {/* Query usage section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Query usage
        </h2>

        {/* Upgrade banner (> 80%) */}
        {showUpgradeBanner && nextPlan && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50">
            <Zap size={14} className="text-amber-500 shrink-0" />
            <p className="flex-1 text-sm text-amber-800">
              <span className="font-semibold">{queryPct}% of monthly queries used.</span>
              {" "}Upgrade to unlock more capacity and avoid interruptions.
            </p>
            <Link
              href={`/org/billing?plan=${nextPlan}`}
              className="flex-shrink-0 rounded-lg bg-amber-500 text-white text-xs font-medium px-3 py-1.5 hover:bg-amber-600 transition-colors whitespace-nowrap"
            >
              Upgrade to {nextPlan} — ${nextPrice}/mo
            </Link>
          </div>
        )}

        {/* Progress bar */}
        <div className="bg-surface rounded-xl border border-[var(--border)] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text)]">
              <span className="font-bold">{queriesUsed.toLocaleString()}</span>
              {queryLimit !== null && (
                <>
                  {" "}of {queryLimit.toLocaleString()} queries used this month{" "}
                  <span className={cn("font-semibold", textColor(queryPct))}>
                    ({queryPct}%)
                  </span>
                </>
              )}
              {queryLimit === null && " queries used this month (unlimited)"}
            </p>
            {daysRemaining > 0 && (
              <p className="text-xs text-[var(--text-muted)] shrink-0">
                Resets in {daysRemaining}d
              </p>
            )}
          </div>

          <div className="w-full h-4 rounded-full bg-surface-2 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", barColor(queryPct))}
              style={{ width: `${queryPct}%` }}
            />
          </div>

          {queryLimit !== null && (
            <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
              <span>0</span>
              <span className="tabular-nums">{queryLimit.toLocaleString()}</span>
            </div>
          )}
        </div>
      </section>

      {/* Success rate */}
      {successRate && (
        <SuccessRateWidget data={successRate} />
      )}

      {/* Usage by member */}
      {sortedMemberUsage.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Usage by member
          </h2>
          <div className="bg-surface rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-surface-2">
                  {["Member", "Queries (mo)", "% of total", "Last query"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sortedMemberUsage.map((stat) => {
                  const member = memberMap.get(stat.user_id)
                  const memberPct = totalMemberQueries > 0
                    ? Math.round((stat.queries_this_month / totalMemberQueries) * 100)
                    : 0
                  return (
                    <tr key={stat.user_id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {member ? (
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0",
                              `bg-violet`
                            )}>
                              {(member.name?.charAt(0) || member.email.charAt(0)).toUpperCase()}
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-surface-2 shrink-0" />
                          )}
                          <span className="text-xs font-medium text-[var(--text)]">
                            {member?.name || member?.email || stat.user_id.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-dim)] tabular-nums font-medium">
                        {stat.queries_this_month.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand/60"
                              style={{ width: `${memberPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-[var(--text-muted)] tabular-nums w-8">{memberPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {stat.last_query_at
                          ? formatDistanceToNow(new Date(stat.last_query_at), { addSuffix: true })
                          : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Other limits */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Other limits
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <LimitCard
            icon={Database}
            label="Connections"
            used={usage?.connections_used ?? 0}
            limit={usage?.connection_limit ?? null}
            unit="used"
            planName={planName}
          />
          <LimitCard
            icon={FileDown}
            label="Exports"
            used={usage?.exports_used ?? 0}
            limit={usage?.export_limit ?? null}
            unit="used"
            planName={planName}
          />
          <LimitCard
            icon={Clock}
            label="History retention"
            used={usage?.history_days ?? 0}
            limit={null}
            limitLabel={`${usage?.history_days ?? 0} days`}
            planName={planName}
          />
          <LimitCard
            icon={Users}
            label="Team seats"
            used={usage?.seats_used ?? 0}
            limit={usage?.seat_limit ?? null}
            unit="seats"
            planName={planName}
          />
        </div>
      </section>
    </div>
  )
}
