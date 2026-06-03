"use client"

import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { DollarSign, Clock, Zap, TrendingDown } from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { LlmCostReport } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-100", className)} />
}

function fmtDay(iso: string) {
  const d = new Date(iso)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

function marginColor(pct: number) {
  if (pct >= 60) return "text-green-600"
  if (pct >= 30) return "text-amber-600"
  return "text-red-600"
}

const PLAN_COLOR: Record<string, string> = {
  free: "#9ca3af",
  starter: "#3b82f6",
  pro: "#7c3aed",
  team: "#f59e0b",
}

const TIER_COLORS: Record<string, string> = {
  fast: "#10b981",
  primary: "#7c3aed",
  complex: "#ef4444",
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LlmCostPage() {
  const { data, isLoading } = useQuery<LlmCostReport>({
    queryKey: ["admin-llm-costs"],
    queryFn: adminApi.llmCostReport,
    staleTime: 60 * 60_000,
  })

  const costTrend = (data?.cost_trend ?? []).map((p) => ({
    ...p,
    label: fmtDay(p.day),
  }))

  const tierPie = (data?.model_tier_breakdown ?? []).map((t) => ({
    name: t.tier,
    value: t.pct,
    count: t.query_count,
  }))

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <DollarSign size={18} className="text-gray-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">LLM Cost Analysis</h1>
            {data?.generated_at && (
              <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
                <Clock size={12} />
                Last updated {formatDistanceToNow(new Date(data.generated_at), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cost trend — last 30 days */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Total daily LLM cost — last 30 days</p>
        {isLoading ? (
          <Skeleton className="h-52" />
        ) : costTrend.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={costTrend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
              <Tooltip
                formatter={(v) => [`$${Number(v).toFixed(4)}`, "LLM cost"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="cost_usd"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#costGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two-column: Model tier pie + Per-plan profitability table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Model tier breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Model tier breakdown</p>
          {isLoading ? (
            <Skeleton className="h-48" />
          ) : tierPie.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={tierPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    strokeWidth={1}
                  >
                    {tierPie.map((entry) => (
                      <Cell key={entry.name} fill={TIER_COLORS[entry.name] ?? "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, _name) => [`${Number(v).toFixed(1)}%`, String(_name)]}
                    contentStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex flex-col gap-1.5 mt-2">
                {tierPie.map((t) => (
                  <li key={t.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: TIER_COLORS[t.name] ?? "#6b7280" }}
                      />
                      <span className="text-gray-700 capitalize font-medium">{t.name}</span>
                    </span>
                    <span className="text-gray-500 tabular-nums">
                      {t.value.toFixed(1)}% · {t.count.toLocaleString()} q
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Per-plan profitability */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Per-plan profitability</p>
          </div>
          {isLoading ? (
            <div className="p-5"><Skeleton className="h-40" /></div>
          ) : (data?.plan_profitability ?? []).length === 0 ? (
            <p className="px-5 py-10 text-sm text-gray-400 text-center">No data.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Plan", "Avg queries/mo", "Avg LLM cost", "Plan revenue", "Gross margin"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data!.plan_profitability).map((p) => (
                  <tr key={p.plan} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 rounded text-xs font-medium border"
                        style={{
                          backgroundColor: `${PLAN_COLOR[p.plan] ?? "#6b7280"}15`,
                          color: PLAN_COLOR[p.plan] ?? "#6b7280",
                          borderColor: `${PLAN_COLOR[p.plan] ?? "#6b7280"}30`,
                        }}
                      >
                        {p.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 tabular-nums">{p.avg_queries_month.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums font-medium">
                      ${p.avg_llm_cost_usd.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums">${p.plan_revenue_usd.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold tabular-nums text-sm", marginColor(p.gross_margin_pct))}>
                          {p.gross_margin_pct.toFixed(1)}%
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[80px]">
                          <div
                            className={cn(
                              "h-1.5 rounded-full",
                              p.gross_margin_pct >= 60 ? "bg-green-500"
                              : p.gross_margin_pct >= 30 ? "bg-amber-400"
                              : "bg-red-500"
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, p.gross_margin_pct))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Top 20 most expensive tenants */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Top 20 most expensive tenants</p>
        </div>
        {isLoading ? (
          <div className="p-5 flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (data?.top_expensive_tenants ?? []).length === 0 ? (
          <p className="px-5 py-10 text-sm text-gray-400 text-center">No data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["#", "Tenant", "Total LLM cost", "Queries", "Cost / query"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data!.top_expensive_tenants).slice(0, 20).map((t, i) => (
                <tr key={t.tenant_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.tenant_name}</td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums font-medium">
                    ${t.total_cost_usd.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 tabular-nums">{t.queries_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">
                    ${t.queries_count > 0
                      ? (t.total_cost_usd / t.queries_count).toFixed(5)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
