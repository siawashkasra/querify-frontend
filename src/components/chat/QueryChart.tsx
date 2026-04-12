"use client"

import { useMemo } from "react"
import { format as formatDate, parseISO, isValid, differenceInDays } from "date-fns"
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  CartesianGrid, XAxis, YAxis, Tooltip,
} from "recharts"
import type { TooltipContentProps } from "recharts"
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent"
import type { ChartConfig } from "@/types"

const BRAND = "#7c3aed"
const BRAND_MID = "#8b5cf6"
const BRAND_DARK = "#6d28d9"
const CHART_HEIGHT = 280

const DATE_KEYWORDS = ["date", "month", "week", "year", "created", "_at", "time"]
const CURRENCY_KEYWORDS = ["revenue", "amount", "cost", "price", "sales", "total", "mrr", "arr"]
const PERCENT_KEYWORDS = ["rate", "percent", "pct", "ratio", "churn"]

const isDateCol = (col: string) => DATE_KEYWORDS.some((k) => col.toLowerCase().includes(k))
const isCurrencyCol = (col: string) => CURRENCY_KEYWORDS.some((k) => col.toLowerCase().includes(k))
const isPercentCol = (col: string) => PERCENT_KEYWORDS.some((k) => col.toLowerCase().includes(k))

function pickDateFormat(values: string[]): string {
  const dates = values.map((v) => parseISO(v)).filter(isValid)
  if (dates.length < 2) return "MMM d, yyyy"
  const span = Math.abs(differenceInDays(dates[dates.length - 1], dates[0]))
  if (span <= 2) return "MMM d, HH:mm"
  if (span <= 90) return "MMM d"
  if (span <= 730) return "MMM yyyy"
  return "yyyy"
}

function formatAxisValue(value: unknown): string {
  const n = Number(value)
  if (isNaN(n)) return String(value)
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

function formatTooltipValue(value: unknown, col: string): string {
  const n = Number(value)
  if (isNaN(n)) return String(value)
  const formatted = n.toLocaleString("en-US", { maximumFractionDigits: 2 })
  if (isCurrencyCol(col)) return `$${formatted}`
  if (isPercentCol(col)) return `${formatted}%`
  return formatted
}

function truncate(s: string, len = 10): string {
  return s.length > len ? `${s.slice(0, len)}…` : s
}

function makeTooltip(yKey: string) {
  return function CustomTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg px-3 py-2 max-w-[200px]">
        <p className="text-[11px] text-[var(--text-muted)] mb-0.5 truncate">{String(label)}</p>
        <p className="font-mono text-sm font-semibold text-[var(--text)]">
          {formatTooltipValue(payload[0].value, yKey)}
        </p>
      </div>
    )
  }
}

interface QueryChartProps {
  config: ChartConfig
  rows: Record<string, unknown>[]
}

export const QueryChart = ({ config, rows }: QueryChartProps) => {
  const { type, x_field, y_field, title } = config

  const data = useMemo(() => {
    const filtered = rows.filter((row) => row[y_field] != null)
    const isDate = isDateCol(x_field)
    const rawXValues = isDate ? filtered.map((r) => String(r[x_field] ?? "")).filter(Boolean) : []
    const dateFmt = isDate ? pickDateFormat(rawXValues) : ""
    return filtered.map((row) => {
      const xRaw = row[x_field]
      let xVal: string
      if (isDate && typeof xRaw === "string") {
        const parsed = parseISO(xRaw)
        xVal = isValid(parsed) ? formatDate(parsed, dateFmt) : String(xRaw)
      } else {
        xVal = String(xRaw ?? "")
      }
      const yRaw = row[y_field]
      const yVal = !isNaN(Number(yRaw)) ? parseFloat(String(yRaw)) : yRaw
      return { [x_field]: xVal, [y_field]: yVal }
    })
  }, [rows, x_field, y_field])

  const TooltipContent = useMemo(() => makeTooltip(y_field), [y_field])

  if (data.length < 2) {
    return (
      <p className="text-xs text-[var(--text-muted)] py-2">
        Not enough data to display a chart. Showing table only.
      </p>
    )
  }

  const sharedGridProps = { stroke: "var(--border)", strokeDasharray: "3 3", vertical: false }
  const sharedXProps = {
    dataKey: x_field,
    tick: { fill: "var(--text-muted)", fontFamily: "IBM Plex Mono", fontSize: 11 },
    tickLine: false,
    axisLine: { stroke: "var(--border)" },
    tickFormatter: (v: unknown) => truncate(String(v), 10),
  }
  const sharedYProps = {
    tick: { fill: "var(--text-muted)", fontFamily: "IBM Plex Mono", fontSize: 11 },
    tickLine: false,
    axisLine: false,
    width: 56,
    tickFormatter: formatAxisValue,
  }
  const tooltipEl = <Tooltip content={TooltipContent} cursor={{ fill: "var(--surface-3)" }} />

  return (
    <div className="flex flex-col gap-1.5">
      {title && <p className="text-sm text-[var(--text-dim)]">{title}</p>}

      {type === "bar" && (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={data} barSize={28}>
            <CartesianGrid {...sharedGridProps} />
            <XAxis {...sharedXProps} />
            <YAxis {...sharedYProps} />
            {tooltipEl}
            <Bar dataKey={y_field} fill={BRAND_DARK} radius={[4, 4, 0, 0]} activeBar={{ fill: BRAND_MID }} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {type === "bar_horizontal" && (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={data} layout="vertical" barSize={20}>
            <CartesianGrid {...sharedGridProps} horizontal={false} vertical={false} />
            <XAxis type="number" tick={{ fill: "var(--text-muted)", fontFamily: "IBM Plex Mono", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatAxisValue} />
            <YAxis type="category" dataKey={x_field} tick={{ fill: "var(--text-muted)", fontFamily: "IBM Plex Mono", fontSize: 11 }} tickLine={false} axisLine={false} width={100} tickFormatter={(v: unknown) => truncate(String(v), 14)} />
            {tooltipEl}
            <Bar dataKey={y_field} fill={BRAND_DARK} radius={[0, 4, 4, 0]} activeBar={{ fill: BRAND_MID }} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {type === "line" && (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={data}>
            <CartesianGrid {...sharedGridProps} />
            <XAxis {...sharedXProps} />
            <YAxis {...sharedYProps} />
            {tooltipEl}
            <Line dataKey={y_field} stroke={BRAND} strokeWidth={2} dot={false} type="monotone" activeDot={{ r: 4, fill: BRAND }} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {type === "area" && (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BRAND} stopOpacity={0.2} />
                <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...sharedGridProps} />
            <XAxis {...sharedXProps} />
            <YAxis {...sharedYProps} />
            {tooltipEl}
            <Area dataKey={y_field} stroke={BRAND} strokeWidth={2} fill="url(#brandGradient)" type="monotone" dot={false} activeDot={{ r: 4, fill: BRAND }} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {type !== "bar" && type !== "bar_horizontal" && type !== "line" && type !== "area" && (
        <p className="text-xs text-[var(--text-muted)] py-2">
          Chart type &quot;{type}&quot; is not supported yet.
        </p>
      )}
    </div>
  )
}

export default QueryChart
