// U4 — the single chart theme. Every chart in the product (chat ChartCell,
// dashboard Sparkline, QueryChart) imports from here so they read as one family.
// Colors are CSS variables (resolved by the browser inside SVG) — never raw hex,
// so the U1 palette stays the single source of truth.

/** Series palette, in order. Five colors, no others — no rainbow. */
export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

/** nth series color, cycling. */
export function seriesColor(i: number): string {
  return CHART_SERIES[i % CHART_SERIES.length]
}

/** The lead/emphasis color (ranking winner, single-series line/area). */
export const EMPHASIS = "var(--chart-1)"

/** Diagnostic / diverging tones. */
export const POSITIVE = "var(--verify)"
export const NEGATIVE = "var(--alert)"

/** Sparklines are texture, not semaphores — always one quiet ink, never colored
 *  by direction. The delta chip carries the judgment. */
export const SPARK_COLOR = "var(--ink-dim)"
export const SPARK_OPACITY = 0.6

export const CHART_HEIGHT = 280
export const CHART_HEIGHT_MOBILE = 220
export const SPARK_HEIGHT = 40

/** Axis tick style — 11px mono ink-dim, used for both axes. */
export const axisTick = {
  fill: "var(--ink-dim)",
  fontFamily: "var(--font-data)",
  fontSize: 11,
} as const

export const TICK_MARGIN = 8

/** Horizontal-only grid: a single hairline per row, no vertical lines. */
export const gridStroke = "var(--line)"

/** Zero reference line for diverging charts: ink at 30%. */
export const ZERO_LINE = "var(--ink)"
export const ZERO_LINE_OPACITY = 0.3

/** Bar corner radii. */
export const BAR_RADIUS_VERTICAL: [number, number, number, number] = [4, 4, 0, 0]
export const BAR_RADIUS_HORIZONTAL: [number, number, number, number] = [0, 4, 4, 0]

/** Line / area geometry. */
export const LINE_WIDTH = 2
export const ACTIVE_DOT_RADIUS = 2.5
export const AREA_GRADIENT_TOP = 0.18
export const AREA_GRADIENT_BOTTOM = 0

/** Tooltip cursor fill (the hover band behind bars). */
export const tooltipCursor = { fill: "var(--violet-soft)" } as const

/** Class names for the custom tooltip surface — surface bg, float shadow,
 *  12px, mono value rows. */
export const tooltipSurfaceClass =
  "rounded-ctrl border border-line bg-surface shadow-float px-3 py-2 max-w-[220px]"
export const tooltipLabelClass = "text-[11px] text-ink-dim mb-1 truncate"
export const tooltipValueClass =
  "font-data text-sm font-semibold text-ink flex items-center gap-1.5 tabular-nums"
