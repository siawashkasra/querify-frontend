"use client"

import { useEffect, useMemo, useState } from "react"
import { format as formatDate, parseISO, isValid, differenceInDays } from "date-fns"
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie,
  ScatterChart, Scatter,
  ComposedChart,
  RadialBarChart, RadialBar,
  Cell, CartesianGrid, XAxis, YAxis, ZAxis, Tooltip, Legend, ReferenceLine, PolarAngleAxis,
} from "recharts"
import type { ChartConfig } from "@/types"
import { formatUnknownForUi } from "@/lib/formatDisplayValue"
import { formatAxis, formatByField, isPercentField } from "@/lib/formatNumber"

const BRAND = "#7c3aed"
const BRAND_DARK = "#6d28d9"
const BRAND_MUTED = "#c4b5fd"
const SUCCESS = "#16a34a"
const DANGER = "#dc2626"
const CATEGORICAL = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#d97706", "#db2777", "#65a30d", "#9333ea"]
const CHART_HEIGHT = 280
const SPARK_HEIGHT = 48

const DATE_KEYWORDS = ["date", "month", "week", "year", "created", "_at", "time", "period", "quarter", "day"]
const isDateCol = (col: string) => DATE_KEYWORDS.some((k) => col.toLowerCase().includes(k))

function truncate(s: string, len = 12): string {
  return s.length > len ? `${s.slice(0, len)}…` : s
}

function pickDateFormat(values: string[]): string {
  const dates = values.map((v) => parseISO(v)).filter(isValid)
  if (dates.length < 2) return "MMM d, yyyy"
  const span = Math.abs(differenceInDays(dates[dates.length - 1], dates[0]))
  if (span <= 2) return "MMM d, HH:mm"
  if (span <= 90) return "MMM d"
  if (span <= 730) return "MMM yyyy"
  return "yyyy"
}

function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (v == null || typeof v === "boolean") return null
  // serialized Decimals / formatted strings: strip currency, commas, %, spaces
  const n = Number(String(v).replace(/[$€£¥₹,%\s]/g, ""))
  return Number.isFinite(n) ? n : null
}

// §4 — human labels only: internal column names (prev_total_sales_orders)
// never reach titles, legends or tooltips.
function humanize(field: string): string {
  return String(field || "").replace(/_/g, " ").trim()
}

interface QueryChartProps {
  config: ChartConfig
  rows: Record<string, unknown>[]
}

export const QueryChart = ({ config, rows }: QueryChartProps) => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10)
    return () => clearTimeout(t)
  }, [])

  const x = config.x_field || ""
  const yFields = useMemo(
    () => ((config.series && config.series.length ? config.series : [config.y_field]).filter(Boolean) as string[]),
    [config.series, config.y_field],
  )
  const yPrimary = yFields[0] || ""
  const scheme = config.color_scheme || "brand"

  const { data, xTicks } = useMemo(() => {
    const isDate = !!x && isDateCol(x)
    const rawX = isDate ? rows.map((r) => String(r[x] ?? "")).filter(Boolean) : []
    const dateFmt = isDate ? pickDateFormat(rawX) : ""
    // ratio-style percent series (0.124) render as 12.4 on a 0-100 axis
    const pctFields = new Set(yFields.filter((yf) => {
      if (!isPercentField(yf)) return false
      const vals = rows.map((r) => toNum(r[yf])).filter((n): n is number => n !== null)
      return vals.length > 0 && vals.every((v) => Math.abs(v) <= 1.5)
    }))
    let prepared = rows.map((row) => {
      const out: Record<string, unknown> = {}
      if (x) {
        const xRaw = row[x]
        if (isDate && typeof xRaw === "string") {
          const parsed = parseISO(xRaw)
          out._t = isValid(parsed) ? parsed.getTime() : Number.MAX_SAFE_INTEGER
          out[x] = isValid(parsed) ? formatDate(parsed, dateFmt) : String(xRaw)
        } else {
          out[x] = xRaw == null ? "" : typeof xRaw === "object" ? formatUnknownForUi(xRaw) : String(xRaw)
        }
      }
      for (const yf of yFields) {
        const n = toNum(row[yf])
        out[yf] = n === null ? row[yf] : pctFields.has(yf) ? n * 100 : n
      }
      return out
    })
    if (isDate) {
      // §4 — time axes always sort chronologically
      prepared = [...prepared].sort((a, b) => (a._t as number) - (b._t as number))
    }
    if (config.sort_order && yPrimary) {
      const dir = config.sort_order === "asc" ? 1 : -1
      prepared = [...prepared].sort((a, b) => ((toNum(a[yPrimary]) ?? 0) - (toNum(b[yPrimary]) ?? 0)) * dir)
    }
    // §4 — de-duplicated tick labels (several days can share one "Jun 2026")
    let ticks: string[] | undefined
    if (isDate && x) {
      const seen = new Set<string>()
      ticks = []
      for (const d of prepared) {
        const label = String(d[x])
        if (!seen.has(label)) { seen.add(label); ticks.push(label) }
      }
    }
    return { data: prepared, xTicks: ticks }
  }, [rows, x, yFields, yPrimary, config.sort_order])

  const emphasis = useMemo(() => new Set(config.emphasis_points ?? []), [config.emphasis_points])

  const barFill = (i: number, value: unknown): string => {
    if (scheme === "good_bad") return (toNum(value) ?? 0) >= 0 ? SUCCESS : DANGER
    if (emphasis.has(i)) return BRAND
    if (scheme === "categorical") return CATEGORICAL[i % CATEGORICAL.length]
    if (scheme === "sequential") return emphasis.size ? BRAND_MUTED : BRAND_DARK
    return BRAND_DARK
  }

  const TooltipEl = (
    <Tooltip
      cursor={{ fill: "var(--surface-3, #f1f5f9)" }}
      content={({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        return (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg px-3 py-2 max-w-[220px]">
            {label != null && (
              <p className="text-[11px] text-[var(--text-muted)] mb-1 truncate">
                {typeof label === "object" ? formatUnknownForUi(label) : String(label)}
              </p>
            )}
            {payload.map((p, i) => {
              const field = String(p.dataKey ?? p.name ?? yPrimary)
              return (
                <p key={i} className="font-mono text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
                  {yFields.length > 1 && <span className="inline-block h-2 w-2 rounded-full" style={{ background: CATEGORICAL[i % CATEGORICAL.length] }} />}
                  {yFields.length > 1 && <span className="font-sans font-normal text-[11px] text-[var(--text-muted)]">{humanize(field)}</span>}
                  {formatByField(p.value, field, { compact: false })}
                </p>
              )
            })}
          </div>
        )
      }}
    />
  )

  const yIsPercent = isPercentField(yPrimary)
  const grid = <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
  const xAxis = (
    <XAxis dataKey={x} tick={{ fill: "var(--text-muted)", fontFamily: "IBM Plex Mono", fontSize: 11 }}
      tickLine={false} axisLine={{ stroke: "var(--border)" }} interval="preserveStartEnd"
      ticks={xTicks}
      angle={data.length > 8 ? -35 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 56 : 30}
      tickFormatter={(v: unknown) => truncate(String(v), 12)} />
  )
  const yAxis = (
    <YAxis tick={{ fill: "var(--text-muted)", fontFamily: "IBM Plex Mono", fontSize: 11 }} tickLine={false}
      axisLine={false} width={60}
      domain={yIsPercent ? [0, 100] : [0, "auto"]}
      tickFormatter={(v: unknown) => yIsPercent ? `${v}%` : formatAxis(v, yPrimary)} />
  )

  if (!rows.length || (config.type !== "gauge" && data.length < 1)) {
    return <p className="text-xs text-[var(--text-muted)] py-2">Not enough data to display this chart.</p>
  }

  const t = config.type
  let chart: React.ReactNode = null

  if (t === "line" || t === "sparkline") {
    const isSpark = t === "sparkline"
    chart = (
      <ResponsiveContainer width="100%" height={isSpark ? SPARK_HEIGHT : CHART_HEIGHT}>
        <LineChart data={data} margin={isSpark ? { top: 4, bottom: 4, left: 0, right: 0 } : undefined}>
          {!isSpark && grid}{!isSpark && xAxis}{!isSpark && yAxis}{!isSpark && TooltipEl}
          {yFields.length > 1 && !isSpark && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {yFields.map((yf, i) => (
            <Line key={yf} dataKey={yf} name={humanize(yf)} stroke={i === 0 ? BRAND : CATEGORICAL[i % CATEGORICAL.length]} strokeWidth={2}
              dot={false} type="monotone" isAnimationActive={mounted} activeDot={isSpark ? false : { r: 4, fill: BRAND }} />
          ))}
          {config.dashed_from != null && (
            <Line dataKey={yPrimary} stroke={BRAND} strokeWidth={2} strokeDasharray="5 4" dot={false} type="monotone"
              isAnimationActive={false} legendType="none"
              data={data.map((d, i) => (i >= (config.dashed_from as number) - 1 ? d : { ...d, [yPrimary]: null }))} />
          )}
        </LineChart>
      </ResponsiveContainer>
    )
  } else if (t === "area") {
    chart = (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="brandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BRAND} stopOpacity={0.25} />
              <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}{xAxis}{yAxis}{TooltipEl}
          <Area dataKey={yPrimary} name={humanize(yPrimary)} stroke={BRAND} strokeWidth={2} fill="url(#brandGrad)" type="monotone" dot={false} isAnimationActive={mounted} activeDot={{ r: 4, fill: BRAND }} />
        </AreaChart>
      </ResponsiveContainer>
    )
  } else if (t === "bar" || t === "horizontal_bar" || t === "bar_horizontal") {
    const horizontal = t !== "bar"
    chart = (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} barSize={horizontal ? 18 : 28}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fill: "var(--text-muted)", fontFamily: "IBM Plex Mono", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: unknown) => formatAxis(v, yPrimary)} />
              <YAxis type="category" dataKey={x} tick={{ fill: "var(--text-muted)", fontFamily: "IBM Plex Mono", fontSize: 11 }} tickLine={false} axisLine={false} width={110} tickFormatter={(v: unknown) => truncate(String(v), 16)} />
            </>
          ) : (<>{xAxis}{yAxis}</>)}
          {TooltipEl}
          <Bar dataKey={yPrimary} name={humanize(yPrimary)} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={mounted}>
            {data.map((d, i) => <Cell key={i} fill={barFill(i, d[yPrimary])} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  } else if (t === "grouped_bar" || t === "stacked_bar" || t === "stacked_100_bar") {
    const stackId = t === "grouped_bar" ? undefined : "stack"
    const pct = t === "stacked_100_bar"
    const plotData = pct ? to100Pct(data, yFields) : data
    chart = (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={plotData} barSize={28}>
          {grid}{xAxis}
          <YAxis tick={{ fill: "var(--text-muted)", fontFamily: "IBM Plex Mono", fontSize: 11 }} tickLine={false} axisLine={false} width={60} tickFormatter={(v: unknown) => pct ? `${v}%` : formatAxis(v, yPrimary)} />
          {TooltipEl}
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {yFields.map((yf, i) => (
            <Bar key={yf} dataKey={yf} name={humanize(yf)} stackId={stackId} fill={CATEGORICAL[i % CATEGORICAL.length]} radius={stackId ? 0 : [4, 4, 0, 0]} isAnimationActive={mounted} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  } else if (t === "donut" || t === "pie") {
    chart = (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <PieChart>
          <Pie data={data} dataKey={yPrimary} nameKey={x} cx="50%" cy="50%" outerRadius={100}
            innerRadius={t === "donut" ? 60 : 0} paddingAngle={2} isAnimationActive={mounted}
            label={(p: { name?: unknown }) => truncate(String(p.name ?? ""), 14)} labelLine={false}>
            {data.map((_, i) => <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} />)}
          </Pie>
          {TooltipEl}
        </PieChart>
      </ResponsiveContainer>
    )
  } else if (t === "scatter") {
    const yScatter = yFields[1] || config.y_axis || yPrimary
    chart = (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ScatterChart>
          {grid}
          <XAxis type="number" dataKey={x} name={humanize(x)} tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} tickFormatter={(v: unknown) => formatAxis(v, x)} />
          <YAxis type="number" dataKey={yScatter} name={humanize(yScatter)} tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickLine={false} axisLine={false} width={60} tickFormatter={(v: unknown) => formatAxis(v, yScatter)} />
          <ZAxis range={[40, 40]} />
          {TooltipEl}
          <Scatter data={data} fill={BRAND} isAnimationActive={mounted} />
        </ScatterChart>
      </ResponsiveContainer>
    )
  } else if (t === "histogram") {
    const valueField = x || yPrimary
    const binned = binValues(rows.map((r) => toNum(r[valueField])).filter((n): n is number => n !== null))
    chart = (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={binned} barSize={28} barCategoryGap={2}>
          {grid}
          <XAxis dataKey="bin" tick={{ fill: "var(--text-muted)", fontFamily: "IBM Plex Mono", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} angle={-30} textAnchor="end" height={50} />
          <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          {TooltipEl}
          <Bar dataKey="count" fill={BRAND_DARK} radius={[4, 4, 0, 0]} isAnimationActive={mounted} />
        </BarChart>
      </ResponsiveContainer>
    )
  } else if (t === "waterfall") {
    const wf = buildWaterfall(data, x, yPrimary)
    chart = (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={wf} barSize={32}>
          {grid}{xAxis}{yAxis}{TooltipEl}
          <ReferenceLine y={0} stroke="var(--border)" />
          <Bar dataKey="_base" stackId="wf" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="_delta" stackId="wf" radius={[3, 3, 0, 0]} isAnimationActive={mounted}>
            {wf.map((d, i) => <Cell key={i} fill={d._total ? BRAND : (d._raw as number) >= 0 ? SUCCESS : DANGER} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  } else if (t === "gauge") {
    const raw = toNum(data[0]?.[yPrimary]) ?? toNum(rows[0]?.[yPrimary]) ?? 0
    const isPct = isPercentField(yPrimary)
    const value = isPct && Math.abs(raw) <= 1.5 ? raw * 100 : raw
    const max = isPct ? 100 : Math.max(value * 1.25, 1)
    chart = (
      <div className="relative">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: yPrimary, value }]} startAngle={210} endAngle={-30}>
            <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={8} fill={BRAND} isAnimationActive={mounted} background={{ fill: "var(--surface-3, #f1f5f9)" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-2xl font-semibold text-brand">{formatByField(raw, yPrimary)}</span>
        </div>
      </div>
    )
  } else if (t === "combo") {
    const barField = yFields[0]
    const lineField = yFields[1] || yFields[0]
    chart = (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart data={data}>
          {grid}{xAxis}{yAxis}{TooltipEl}
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey={barField} name={humanize(barField)} fill={BRAND_DARK} radius={[4, 4, 0, 0]} isAnimationActive={mounted} />
          {lineField !== barField && <Line dataKey={lineField} name={humanize(lineField)} stroke={CATEGORICAL[1]} strokeWidth={2} dot={false} type="monotone" isAnimationActive={mounted} />}
        </ComposedChart>
      </ResponsiveContainer>
    )
  } else {
    chart = <p className="text-xs text-[var(--text-muted)] py-2">Chart type &quot;{t}&quot; is not supported yet.</p>
  }

  return (
    <div className="flex flex-col gap-1.5 transition-opacity duration-300" style={{ opacity: mounted ? 1 : 0 }}>
      {config.title && t !== "sparkline" && <p className="text-sm text-[var(--text-dim)]">{humanize(config.title)}</p>}
      {chart}
    </div>
  )
}

// ── data transforms ────────────────────────────────────────────────────────
function binValues(values: number[], bins = 10): { bin: string; count: number }[] {
  if (!values.length) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return [{ bin: formatAxis(min), count: values.length }]
  const width = (max - min) / bins
  const out = Array.from({ length: bins }, (_, i) => ({
    bin: `${formatAxis(min + i * width)}–${formatAxis(min + (i + 1) * width)}`,
    count: 0,
  }))
  for (const v of values) {
    const idx = Math.min(bins - 1, Math.floor((v - min) / width))
    out[idx].count += 1
  }
  return out
}

function buildWaterfall(data: Record<string, unknown>[], x: string, y: string): Record<string, unknown>[] {
  let running = 0
  const out: Record<string, unknown>[] = data.map((d) => {
    const delta = Number(d[y]) || 0
    const base = delta >= 0 ? running : running + delta
    const row = { [x]: d[x], _delta: Math.abs(delta), _base: base, _total: false, _raw: delta }
    running += delta
    return row
  })
  out.push({ [x]: "Total", _delta: Math.abs(running), _base: 0, _total: true, _raw: running })
  return out
}

function to100Pct(data: Record<string, unknown>[], yFields: string[]): Record<string, unknown>[] {
  return data.map((d) => {
    const total = yFields.reduce((s, f) => s + (Number(d[f]) || 0), 0) || 1
    const out: Record<string, unknown> = { ...d }
    for (const f of yFields) out[f] = Math.round(((Number(d[f]) || 0) / total) * 1000) / 10
    return out
  })
}

export default QueryChart
