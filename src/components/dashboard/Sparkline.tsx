"use client"

// Tiny dependency-free SVG sparkline for KPI tiles.
interface SparklineProps {
  points: { value: number }[]
  color?: string
  width?: number
  height?: number
}

export default function Sparkline({ points, color = "var(--brand)", width = 96, height = 28 }: SparklineProps) {
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
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={2.5} fill={color} />
    </svg>
  )
}
