"use client"

import { SPARK_COLOR, SPARK_OPACITY, SPARK_HEIGHT } from "@/lib/chartTheme"

// U4 — Tiny dependency-free SVG sparkline. Texture, not a semaphore: ALWAYS one
// quiet ink (--ink-dim at 60%), never colored by direction — the delta chip
// carries the judgment. Last point is a hollow (dotted) dot. The legacy `color`
// prop is accepted but intentionally ignored.
interface SparklineProps {
  points: { value: number }[]
  /** @deprecated sparklines are always ink-dim; this is ignored. */
  color?: string
  width?: number
  height?: number
}

export default function Sparkline({ points, width = 96, height = SPARK_HEIGHT }: SparklineProps) {
  const values = points.map((p) => p.value).filter((v) => Number.isFinite(v))
  if (values.length < 2) return <div style={{ width, height }} aria-hidden />

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = width / (values.length - 1)
  const coords = values.map((v, i) => [i * stepX, height - ((v - min) / span) * (height - 4) - 2] as const)
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const [lx, ly] = coords[coords.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden
      style={{ opacity: SPARK_OPACITY }}>
      <path d={d} fill="none" stroke={SPARK_COLOR} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={2} fill="none" stroke={SPARK_COLOR} strokeWidth={1.5} />
    </svg>
  )
}
