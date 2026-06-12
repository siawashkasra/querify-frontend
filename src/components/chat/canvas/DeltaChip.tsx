"use client"

import { cn } from "@/lib/cn"

interface Props {
  delta: number
  /** Which direction is *good* for this measure. Without it we stay neutral —
   *  we never assume up=green. */
  goodDirection?: "up" | "down" | null
  label?: string | null
  className?: string
}

// U3 — the delta chip. Tone is decided by good_direction (a fall in churn is
// good, a fall in revenue is bad), never by the raw sign. With no good_direction
// known, the chip reads neutral ink — no misleading green-for-up.
export function DeltaChip({ delta, goodDirection, label, className }: Props) {
  const dir = delta > 0 ? "up" : delta < 0 ? "down" : "flat"
  const glyph = dir === "up" ? "▲" : dir === "down" ? "▼" : "–"

  let tone = "bg-line/60 text-ink-dim"
  if (goodDirection && dir !== "flat") {
    tone = dir === goodDirection ? "bg-verify/12 text-verify" : "bg-alert/12 text-alert"
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-1.5 py-0.5 text-[11px] font-medium font-data tabular-nums",
        tone,
        className
      )}
    >
      <span aria-hidden>{glyph}</span>
      {Math.abs(delta).toFixed(1)}%{label ? <span className="font-sans ml-0.5">{label}</span> : null}
    </span>
  )
}

export default DeltaChip
