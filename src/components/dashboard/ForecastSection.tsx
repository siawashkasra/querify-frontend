"use client"

// §6 — the forecast card: history (solid) → projection (dashed) inside its
// 95% band. Uncertainty is ALWAYS displayed — the band is the forecast, not
// the line. A flagged projection renders as "withheld", never a number.

import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, ShieldAlert } from "lucide-react"
import { formatByField } from "@/lib/formatNumber"
import type { BriefingForecast } from "@/types"

const BRAND = "#7c3aed"

export default function ForecastSection({ forecast }: { forecast: BriefingForecast }) {
  if (!forecast.ok || !forecast.points?.length) {
    if (!forecast.flagged_reason) return null
    return (
      <section className="rounded-xl border border-[var(--border)] bg-white px-6 py-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <TrendingUp size={15} className="text-[var(--text-muted)]" /> Forecast — {forecast.measure}
        </h2>
        <p className="mt-2 flex items-start gap-2 text-sm text-[var(--text-muted)]">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-warning" />
          Projection withheld: {forecast.flagged_reason}
        </p>
      </section>
    )
  }

  const histN = forecast.history.length
  const data = [
    ...forecast.history.map((h) => ({ period: h.period, actual: h.value, projected: null as number | null, band: null as [number, number] | null })),
    // bridge point so the dashed line connects to the last actual
    ...forecast.points.map((p) => ({ period: p.period, actual: null as number | null, projected: p.value, band: [p.lo, p.hi] as [number, number] })),
  ]
  if (histN > 0) data[histN - 1].projected = forecast.history[histN - 1].value

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white px-6 py-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <TrendingUp size={15} className="text-brand" /> Forecast — {forecast.measure}
        </h2>
        <span className="text-[11px] text-[var(--text-muted)]">{forecast.method} · confidence: {forecast.confidence}</span>
      </div>
      <div className="mt-3">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={false} width={64}
              tickFormatter={(v: unknown) => formatByField(v, forecast.format === "currency" ? "revenue" : "count", { currency: forecast.currency })} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const row = payload[0]?.payload as { actual?: number | null; projected?: number | null; band?: [number, number] | null }
              return (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg px-3 py-2">
                  <p className="text-[11px] text-[var(--text-muted)] mb-1">{String(label)}</p>
                  {row.actual != null && <p className="font-mono text-sm font-semibold">{formatByField(row.actual, "revenue", { currency: forecast.currency })}</p>}
                  {row.actual == null && row.projected != null && (
                    <>
                      <p className="font-mono text-sm font-semibold text-brand">{formatByField(row.projected, "revenue", { currency: forecast.currency })} projected</p>
                      {row.band && <p className="font-mono text-[11px] text-[var(--text-muted)]">{formatByField(row.band[0], "revenue", { currency: forecast.currency })} – {formatByField(row.band[1], "revenue", { currency: forecast.currency })} (95%)</p>}
                    </>
                  )}
                </div>
              )
            }} />
            <Area dataKey="band" stroke="none" fill={BRAND} fillOpacity={0.12} isAnimationActive={false} connectNulls={false} />
            <Line dataKey="actual" stroke={BRAND} strokeWidth={2} dot={false} type="monotone" isAnimationActive={false} connectNulls={false} />
            <Line dataKey="projected" stroke={BRAND} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: BRAND }} type="monotone" isAnimationActive={false} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        {forecast.points.map((p) => (
          <span key={p.period} className="text-xs text-[var(--text-dim)]">
            <span className="font-mono font-semibold text-[var(--text)]">{p.period}</span>: {p.formatted ?? p.value}
            <span className="text-[var(--text-muted)]"> ({p.formatted_range ?? `${p.lo} – ${p.hi}`})</span>
          </span>
        ))}
      </div>
      {forecast.caveats?.length > 0 && (
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">⚠ {forecast.caveats[0]}</p>
      )}
    </section>
  )
}
