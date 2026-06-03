"use client"

import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow, format } from "date-fns"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import {
  DollarSign, Users, TrendingUp, TrendingDown, Clock,
} from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { RevenueKpis, RevenueCharts } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-100", className)} />
}

function fmtMrr(cents: number) {
  if (cents >= 100_000) return `$${(cents / 100_000).toFixed(1)}k`
  return `$${(cents / 100).toFixed(0)}`
}

function fmtMonth(iso: string) {
  const d = new Date(iso)
  return format(d, "MMM yy")
}

function KpiCard({
  label, value, sub, icon: Icon, valueClass, trend,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  valueClass?: string
  trend?: "up" | "down"
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
          <Icon size={14} className="text-gray-400" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <p className={cn("text-2xl font-bold tabular-nums", valueClass ?? "text-gray-900")}>{value}</p>
        {trend === "up" && <TrendingUp size={14} className="text-green-500 mb-1" />}
        {trend === "down" && <TrendingDown size={14} className="text-red-500 mb-1" />}
      </div>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const { data: kpis, isLoading: kpisLoading } = useQuery<RevenueKpis>({
    queryKey: ["admin-revenue-kpis"],
    queryFn: adminApi.revenueKpis,
    staleTime: 60 * 60_000,
  })

  const { data: charts, isLoading: chartsLoading } = useQuery<RevenueCharts>({
    queryKey: ["admin-revenue-charts"],
    queryFn: adminApi.revenueCharts,
    staleTime: 60 * 60_000,
  })

  const mrrTrend = (charts?.mrr_trend ?? []).map((p) => ({
    ...p,
    mrr: p.mrr_cents / 100,
    label: fmtMonth(p.month),
  }))

  const mrrMovement = (charts?.mrr_movement ?? []).map((p) => ({
    ...p,
    new_mrr: p.new_mrr_cents / 100,
    churned_mrr: -(p.churned_mrr_cents / 100),
    label: fmtMonth(p.month),
  }))

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <DollarSign size={18} className="text-gray-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Revenue Overview</h1>
            {kpis?.generated_at && (
              <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
                <Clock size={12} />
                Data from Stripe · Updated {formatDistanceToNow(new Date(kpis.generated_at), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
          Data from Stripe, updated daily
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpisLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <KpiCard
              label="MRR"
              value={fmtMrr(kpis?.mrr_cents ?? 0)}
              icon={DollarSign}
              valueClass="text-gray-900"
              trend="up"
            />
            <KpiCard
              label="New MRR this month"
              value={fmtMrr(kpis?.new_mrr_cents ?? 0)}
              icon={TrendingUp}
              valueClass="text-green-600"
              trend="up"
            />
            <KpiCard
              label="Churned MRR"
              value={fmtMrr(kpis?.churned_mrr_cents ?? 0)}
              icon={TrendingDown}
              valueClass={kpis?.churned_mrr_cents ? "text-red-600" : "text-gray-900"}
              trend={kpis?.churned_mrr_cents ? "down" : undefined}
            />
            <KpiCard
              label="Paying tenants"
              value={(kpis?.paying_tenants ?? 0).toLocaleString()}
              icon={Users}
              sub="Active subscriptions"
            />
          </>
        )}
      </div>

      {/* MRR trend — 12 months */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">MRR trend — last 12 months</p>
        {chartsLoading ? (
          <Skeleton className="h-52" />
        ) : mrrTrend.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mrrTrend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                formatter={(v) => [`$${Number(v).toLocaleString()}`, "MRR"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="mrr"
                stroke="#7c3aed"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#7c3aed" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* New vs Churned MRR — last 6 months */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">New vs Churned MRR — last 6 months</p>
        {chartsLoading ? (
          <Skeleton className="h-52" />
        ) : mrrMovement.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mrrMovement} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `$${Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(0)}k` : Math.abs(v)}`}
              />
              <Tooltip
                formatter={(v, name) => [
                  `$${Math.abs(Number(v)).toLocaleString()}`,
                  name === "new_mrr" ? "New MRR" : "Churned MRR",
                ]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend
                formatter={(value) => value === "new_mrr" ? "New MRR" : "Churned MRR"}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="new_mrr" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="churned_mrr" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
