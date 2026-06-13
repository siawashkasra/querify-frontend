"use client"

import { Fragment, useMemo, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { format as formatDate, parseISO, isValid } from "date-fns"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  Legend,
  Cell,
  LabelList,
  type TooltipContentProps,
} from "recharts"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Loader2 } from "lucide-react"
import { insights as insightsApi } from "@/lib/api"
import { cn } from "@/lib/cn"
import type { ChartConfig, Insight, InsightType } from "@/types"

const CHART_HEIGHT = 320

const PERIODS = [
  { id: "3m", label: "3 months" },
  { id: "6m", label: "6 months" },
  { id: "12m", label: "12 months" },
] as const

type PeriodKey = (typeof PERIODS)[number]["id"]

function resolveXY(chart: ChartConfig | null): { x: string; y: string } {
  if (!chart) return { x: "period", y: "value" }
  const x = chart.x_field || chart.x_axis || "period"
  const y = chart.y_field || chart.y_axis || "value"
  return { x: String(x), y: String(y) }
}

export function mergedInsightSeries(insight: Insight): Record<string, unknown>[] {
  const cc = insight.chart_config
  const fromConfig = cc?.data
  if (Array.isArray(fromConfig) && fromConfig.length) return fromConfig as Record<string, unknown>[]
  const snap = insight.data_snapshot as { rows?: unknown[] } | null
  if (snap?.rows && Array.isArray(snap.rows) && snap.rows.length) return snap.rows as Record<string, unknown>[]
  return []
}

function sliceInsightRowsLocal(insightType: InsightType, rows: Record<string, unknown>[], period: PeriodKey): Record<string, unknown>[] {
  if (rows.length < 2) return rows
  const lookup: Partial<Record<InsightType, Record<PeriodKey, number>>> = {
    revenue_trend: { "3m": 3, "6m": 6, "12m": 12 },
    new_users: { "3m": 4, "6m": 8, "12m": 16 },
  }
  const m = lookup[insightType]
  const lim = m?.[period]
  if (!lim) return rows
  const take = Math.min(lim, rows.length)
  return rows.slice(-take)
}

function asNum(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,]/g, ""))
    if (!Number.isNaN(n)) return n
  }
  return undefined
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
}

function formatUsdAxis(value: unknown): string {
  const n = Number(value)
  if (Number.isNaN(n)) return ""
  const abs = Math.abs(n)
  if (abs >= 1e6) return `$${n / 1e6 >= 10 ? Math.round(n / 1e6) : (n / 1e6).toFixed(1)}M`
  if (abs >= 1000) return `$${Math.round(n / 1000)}K`
  return `$${Math.round(n)}`
}

function formatWeekLabel(ix: number, raw: unknown): string {
  const s = raw == null ? "" : String(raw)
  const d = parseISO(s.includes(" ") ? `${s.slice(0, 10)}` : s.slice(0, 10))
  const short = formatDate(isValid(d) ? d : new Date(), "MMM d")
  return ix === 0 ? `W1 (${short})` : short
}

function formatMonthTick(raw: unknown): string {
  const s = String(raw ?? "").trim()
  if (!s) return ""
  if (/^[A-Za-z]{3}\s\d{4}$/.test(s)) return s.slice(0, 3)
  const d = parseISO(s.includes(" ") ? `${s.slice(0, 10)}` : s.slice(0, 19))
  return isValid(d) ? formatDate(d, "MMM") : s.length > 6 ? `${s.slice(0, 3)}` : s
}

function augmentBarsPrior(
  rows: Record<string, unknown>[],
  yKey: string,
  insightType: InsightType,
  snap: Record<string, unknown> | null,
): Record<string, unknown>[] {
  const nums = rows.map((r) => asNum(r[yKey]) ?? 0)
  const prevAgg = snap ? asNum(snap.previous_value) : undefined
  return rows.map((row, i) => {
    let priorBucket: number | null = null
    if (insightType === "revenue_trend" || insightType === "new_users") {
      if (i === 0 && prevAgg !== undefined) priorBucket = prevAgg
      else if (i > 0) priorBucket = nums[i - 1]
    }
    return { ...row, priorBucket }
  })
}

interface RowTableType {
  period: string
  valueFmt: string
  changePct: string
}

function buildTableRows(
  rows: Record<string, unknown>[],
  displayKey: string,
  yKey: string,
  intMode: boolean,
  currency: boolean,
): RowTableType[] {
  const nums = rows.map((r) => asNum(r[yKey]))
  return rows.map((r, i) => {
    const v = nums[i]
    const prev = i > 0 ? nums[i - 1] : undefined
    let pct: string | null = null
    if (prev != null && v != null && Math.abs(prev) > 1e-9 && !Number.isNaN(prev) && !Number.isNaN(v)) {
      pct = `${((v - prev) / prev) * 100 >= 0 ? "+" : ""}${(((v - prev) / prev) * 100).toFixed(1)}%`
    } else pct = i === 0 ? "—" : "—"
    const valueFmt =
      v == null
        ? "—"
        : currency
          ? formatUsd(v)
          : intMode
            ? `${Math.round(v)}`
            : v.toLocaleString("en-US", { maximumFractionDigits: 2 })
    const pv = String(r[displayKey] ?? r[yKey] ?? "")
    const periodDisp = pv || `Row ${i + 1}`
    return { period: periodDisp, valueFmt, changePct: pct ?? "—" }
  })
}

type InsightTooltipExtras = {
  insightType: InsightType
  currency: boolean
  metricKey?: string
}

function InsightTooltipBody({
  insightType,
  currency,
  metricKey,
  active,
  payload,
  label,
}: InsightTooltipExtras & TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  const pv = payload[0]?.payload as Record<string, unknown> | undefined
  const mk = metricKey || "value"
  const currPl = payload.find((p) => String(p?.dataKey) === mk) ?? payload[payload.length - 1]
  const priorPl = payload.find((p) => String(p?.dataKey) === "priorBucket")
  const v0 = typeof currPl?.value === "number" ? (currPl.value as number) : Number(currPl?.value ?? 0)
  let changeTxt: ReactNode = null
  const showCmpDelta = insightType === "revenue_trend" || insightType === "new_users"
  const vPriorRaw = priorPl?.value ?? pv?.priorBucket
  const vPrior = typeof vPriorRaw === "number" ? vPriorRaw : Number(vPriorRaw ?? NaN)
  if (showCmpDelta && priorPl && !Number.isNaN(vPrior) && Math.abs(Number(vPrior)) > 1e-9 && !Number.isNaN(v0)) {
    const v1 = vPrior as number
    const d = ((v0 - v1) / v1) * 100
    const col = d > 0.5 ? "#059669" : d < -0.5 ? "#dc2626" : "#64748b"
    changeTxt = <span className="font-mono text-xs font-semibold" style={{ color: col }}>vs prev period: {d >= 0 ? "+" : ""}{d.toFixed(1)}%</span>
  }
  const val =
    insightType === "new_users"
      ? Math.round(v0).toLocaleString("en-US")
      : currency
        ? formatUsd(v0)
        : v0.toLocaleString("en-US", { maximumFractionDigits: 2 })
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-xl max-w-[240px]" style={{ touchAction: "none" }}>
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{String(label)}</p>
      <p className="font-mono text-lg font-semibold text-[var(--text)]">{val}</p>
      {changeTxt}
    </div>
  )
}

const columnHelper = createColumnHelper<RowTableType>()

function InsightDataTableFold({ insightType, rows, xKey, yKey }: { insightType: InsightType; rows: Record<string, unknown>[]; xKey: string; yKey: string }) {
  const [open, setOpen] = useState(false)
  const currency = insightType === "revenue_trend" || insightType === "top_performer"
  const intMode = insightType === "new_users" || insightType === "churn_signal" || insightType === "anomaly"
  const tableRows = useMemo(() => buildTableRows(rows, xKey, yKey, intMode, currency), [rows, xKey, yKey, intMode, currency])
  const cols = useMemo(
    () => [
      columnHelper.accessor((r) => r.period, { id: "period", header: "Period", cell: (info) => <span className="text-[var(--text)]">{info.getValue()}</span> }),
      columnHelper.accessor((r) => r.valueFmt, { id: "valueFmt", header: "Value", cell: (info) => <span className="font-mono text-[var(--text)]">{info.getValue()}</span> }),
      columnHelper.accessor((r) => r.changePct, { id: "changePct", header: "Change vs prior", cell: (info) => <span className="font-mono">{info.getValue()}</span> }),
    ],
    [],
  )
  const table = useReactTable({ data: tableRows, columns: cols, getCoreRowModel: getCoreRowModel() })
  return (
    <div className="mt-4 border-t border-[var(--border)] pt-3">
      <button type="button" onClick={() => setOpen(!open)} className="text-xs font-semibold text-brand hover:underline">
        {open ? "Hide data table" : "Show data table"}
      </button>
      {open ? (
        <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-xs">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-3 py-2 font-medium text-left text-[var(--text-dim)]">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, i) => (
                <tr key={row.id} className={cn("border-b border-[var(--border)] last:border-0", i % 2 === 0 ? "bg-[var(--surface)]" : "bg-white")}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-1.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function RevenueGrowthChart(props: {
  rows: Record<string, unknown>[]
  xKey: string
  yKey: string
  insightKind: InsightType
  snapshot: Record<string, unknown> | null
  previousValue?: number | undefined
  green: boolean
  weekMode: boolean
}) {
  const { rows, xKey, yKey, insightKind, snapshot, previousValue, green, weekMode } = props
  const snapAug = snapshot
    ? { ...snapshot, ...(previousValue != null ? { previous_value: previousValue } : {}) }
    : (previousValue != null ? { previous_value: previousValue } : null)
  const data = augmentBarsPrior(rows, yKey, insightKind, snapAug)
  const lastIdx = data.length - 1
  const barNow = green ? "#10B981" : "#3B82F6"
  const barBase = green ? "#15803d" : "#1E40AF"
  const barPri = green ? "#6ee7b7" : "#93c5fd"
  const hasCmp = data.some((r) => r.priorBucket != null && typeof r.priorBucket === "number")
  const refGreen = green && previousValue != null ? `Last week: ${Math.round(previousValue).toLocaleString("en-US")}` : ""
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.7} vertical={false} />
        <XAxis type="category" dataKey={xKey} tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-sans)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} tickFormatter={(v, i) => (weekMode ? formatWeekLabel(i, v) : formatMonthTick(v))} interval={0} height={weekMode ? 52 : 32} />
        <YAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} tickFormatter={(v) => (green ? `${Math.round(Number(v))}` : formatUsdAxis(v))} width={green ? 40 : 48} />
        <Tooltip content={(props) => <InsightTooltipBody insightType={green ? "new_users" : "revenue_trend"} currency={!green} metricKey={yKey} {...props} />} cursor={{ fill: "rgba(0,0,0,0.04)" }} wrapperStyle={{ outline: "none", touchAction: "none" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />
        {hasCmp ? (
          <Bar dataKey="priorBucket" name="Last period" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={barPri} fillOpacity={0.72} />
            ))}
          </Bar>
        ) : null}
        <Bar dataKey={yKey} name="This period" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === lastIdx ? barNow : barBase} stroke="transparent" />
          ))}
        </Bar>
        {!green && previousValue != null ? <ReferenceLine y={previousValue} stroke="#475569" strokeDasharray="4 4" label={{ position: "right", fill: "#64748b", fontSize: 11, value: `Last month: ${formatUsd(previousValue)}` }} /> : null}
        {green && previousValue != null ? <ReferenceLine y={previousValue} stroke="#475569" strokeDasharray="4 4" label={{ position: "right", fill: "#64748b", fontSize: 11, value: refGreen }} /> : null}
      </BarChart>
    </ResponsiveContainer>
  )
}

function ChurnChart({ rows, xKey, yKey }: { rows: Record<string, unknown>[]; xKey: string; yKey: string }) {
  const values = rows.map((r) => asNum(r[yKey]) ?? 0)
  const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1)
  const gradId = `churn-grad-${xKey}-${yKey}`
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <AreaChart data={rows} margin={{ top: 16, right: 12, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.7} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={(v) => formatMonthTick(v)} />
        <YAxis tickFormatter={(v) => `${Math.round(Number(v))}`} tick={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }} />
        <Tooltip content={(props) => <InsightTooltipBody insightType="churn_signal" currency={false} metricKey={yKey} {...props} />} cursor={{ stroke: "#fda4af" }} wrapperStyle={{ outline: "none", touchAction: "none" }} />
        <Area type="monotone" dataKey={yKey} stroke="#EF4444" strokeWidth={2} fill={`url(#${gradId})`} activeDot={{ r: 5, stroke: "#FECACA" }} />
        <ReferenceLine y={avg} stroke="#f59e0b" strokeDasharray="6 6" label={{ fill: "#b45309", fontSize: 11, position: "right", value: `Average: ${avg.toFixed(1)}/mo` }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function TopPerformerChart({ rows, xKey, yKey, currency }: { rows: Record<string, unknown>[]; xKey: string; yKey: string; currency: boolean }) {
  const sorted = useMemo(() => [...rows].sort((a, b) => (asNum(b[yKey]) ?? 0) - (asNum(a[yKey]) ?? 0)), [rows, yKey])
  const maxV = sorted.length ? Math.max(...sorted.map((r) => asNum(r[yKey]) ?? 0)) : 0
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart layout="vertical" data={sorted} margin={{ top: 8, right: 72, left: 4, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
        <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }} tickFormatter={(v) => (currency ? formatUsdAxis(v) : String(Math.round(Number(v))))} />
        <YAxis type="category" dataKey={xKey} width={112} tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={(v) => truncate(String(v), 20)} />
        <Tooltip content={(props) => <InsightTooltipBody insightType="top_performer" currency metricKey={yKey} {...props} />} cursor={{ fill: "rgba(139,92,246,0.06)" }} wrapperStyle={{ outline: "none", touchAction: "none" }} />
        <Bar dataKey={yKey} radius={[0, 4, 4, 0]} minPointSize={2}>
          {sorted.map((r) => (
            <Cell key={String(r[xKey])} fill={(asNum(r[yKey]) ?? 0) === maxV ? "#a855f7" : "#8B5CF6"} />
          ))}
          <LabelList dataKey={yKey} position="right" formatter={(value: unknown) => (currency ? formatUsd(Number(value)) : String(Math.round(Number(value))))} style={{ fontFamily: "IBM Plex Mono, monospace", fill: "#334155", fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : `${s.slice(0, n)}…`
}

function AnomalyChart({ rows, xKey, yKey }: { rows: Record<string, unknown>[]; xKey: string; yKey: string }) {
  const { low, high } = useMemo(() => {
    const ys = rows.map((r) => asNum(r[yKey]) ?? 0)
    const histVals = ys.length > 1 ? ys.slice(0, -1) : ys
    const mu = histVals.reduce((a, b) => a + b, 0) / (histVals.length || 1)
    const varSum = histVals.reduce((a, v) => a + (v - mu) ** 2, 0)
    let sd = histVals.length ? Math.sqrt(varSum / histVals.length) : 0
    if (sd === 0) sd = Math.abs(mu) * 0.05 || 1
    return { low: mu - sd, high: mu + sd }
  }, [rows, yKey])

  const lastIx = rows.length - 1

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={rows} margin={{ top: 16, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} vertical={false} />
        <ReferenceArea y1={low} y2={high} strokeOpacity={0} fill="#cbd5e1" fillOpacity={0.35} />
        <XAxis dataKey={xKey} tick={{ fill: "var(--text-muted)", fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }} />
        <Tooltip content={(props) => <InsightTooltipBody insightType="anomaly" currency={false} metricKey={yKey} {...props} />} cursor={{ strokeDasharray: "3 3" }} wrapperStyle={{ outline: "none", touchAction: "none" }} />
        <ReferenceLine stroke="#f59e0b" strokeDasharray="6 6" x={rows[lastIx]?.[xKey] as string | number | undefined} label={{ value: "Anomaly detected", fill: "#b45309", fontSize: 11, position: "top" }} />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke="#64748b"
          strokeWidth={2}
          dot={(props: { cx?: number; cy?: number; index?: number }) =>
            props.index === lastIx && props.cx != null && props.cy != null ? <circle cx={props.cx} cy={props.cy} r={7} fill="#F59E0B" stroke="#fff" strokeWidth={2} /> : false
          }
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function GenericInsightChart({ rows, config }: { rows: Record<string, unknown>[]; config: ChartConfig }) {
  const xKey = config.x_axis || config.x_field
  const yKey = config.y_axis || config.y_field
  const t = config.type
  if (t === "bar" || t === "area") return <ChurnChart rows={rows} xKey={String(xKey)} yKey={String(yKey)} />
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey={String(xKey)} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
        <YAxis />
        <Tooltip wrapperStyle={{ outline: "none" }} />
        <Line type="monotone" dataKey={String(yKey)} stroke="#7c3aed" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export interface InsightDetailChartProps {
  insight: Insight
  modalOpen: boolean
}

export function InsightDetailChart({ insight, modalOpen }: InsightDetailChartProps) {
  const config = insight.chart_config
  const { x: xKey, y: yKey } = resolveXY(config)
  const [period, setPeriod] = useState<PeriodKey>("6m")
  const hasPeriod = insight.type === "revenue_trend" || insight.type === "new_users"
  const merged = useMemo(() => mergedInsightSeries(insight), [insight])
  const fallbackSlice = useMemo(() => sliceInsightRowsLocal(insight.type, merged, period), [insight.type, merged, period])
  const snap = insight.data_snapshot as Record<string, unknown> | null
  const previousValue = snap ? asNum(snap.previous_value) : undefined

  const { data, isFetching } = useQuery({
    queryKey: ["insight-chart-data", insight.id, period],
    queryFn: () => insightsApi.chartData(insight.id, period),
    enabled: modalOpen && hasPeriod && merged.length >= 2,
    staleTime: 30_000,
  })

  const chartRowsRaw = useMemo(() => {
    if (!modalOpen || merged.length < 2) return []
    if (hasPeriod && Array.isArray(data?.data) && data!.data!.length >= 2) return data!.data as Record<string, unknown>[]
    if (hasPeriod) return fallbackSlice
    return merged
  }, [modalOpen, merged, hasPeriod, data, fallbackSlice])

  const title = config?.title || insight.headline

  // A value series fed to a numeric axis MUST be numeric — a non-numeric series
  // gives recharts a NaN domain whose tick computation hangs the page. One guard
  // for every sub-chart below (they all plot `yKey` on a numeric axis).
  const valueNumeric = chartRowsRaw.length === 0 || chartRowsRaw.some((r) => asNum(r[yKey]) !== undefined)

  const body =
    merged.length < 2 || !valueNumeric ? (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm text-[var(--text-muted)] px-6 text-center">Not enough chart data points to display — at least two are required.</div>
    ) : (
      <div className="relative">
        {(hasPeriod ? isFetching : false) ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[var(--surface)]/70">
            <Loader2 size={36} className="animate-spin text-brand" aria-hidden />
          </div>
        ) : null}
        {insight.type === "revenue_trend" ? (
          <RevenueGrowthChart rows={chartRowsRaw} xKey={xKey} yKey={yKey} insightKind={insight.type} snapshot={snap} previousValue={previousValue} green={false} weekMode={false} />
        ) : insight.type === "new_users" ? (
          <RevenueGrowthChart rows={chartRowsRaw} xKey={xKey} yKey={yKey} insightKind={insight.type} snapshot={snap} previousValue={previousValue} green weekMode />
        ) : insight.type === "churn_signal" ? (
          <ChurnChart rows={chartRowsRaw} xKey={xKey} yKey={yKey} />
        ) : insight.type === "top_performer" ? (
          <TopPerformerChart rows={chartRowsRaw} xKey={xKey} yKey={yKey} currency={!!(config?.format === "currency" || snap?.currency)} />
        ) : insight.type === "anomaly" ? (
          <AnomalyChart rows={chartRowsRaw} xKey={xKey} yKey={yKey} />
        ) : config ? (
          <GenericInsightChart rows={chartRowsRaw} config={config} />
        ) : null}
      </div>
    )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text)] pr-4">{title}</h3>
        {hasPeriod && merged.length >= 2 ? (
          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[11px] font-medium">
            {(PERIODS as readonly { id: PeriodKey; label: string }[]).map(({ id: pid, label }, i, arr) => (
              <Fragment key={pid}>
                <button type="button" onClick={() => setPeriod(pid)} className={cn("rounded-md px-2.5 py-1 transition-colors", period === pid ? "bg-brand text-white" : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]")}>{label}</button>
                {i < arr.length - 1 ? <span className="text-[var(--border)] px-px">|</span> : null}
              </Fragment>
            ))}
          </div>
        ) : null}
      </div>
      {body}
      {merged.length >= 2 && chartRowsRaw.length >= 2 ? <InsightDataTableFold insightType={insight.type} rows={chartRowsRaw} xKey={xKey} yKey={yKey} /> : null}
    </div>
  )
}

export default InsightDetailChart
