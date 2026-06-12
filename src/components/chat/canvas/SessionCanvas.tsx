"use client"

import { useRef, useEffect, useCallback } from "react"
import type { AnswerCell, AnswerSection } from "@/types"
import { Chip } from "@/components/ui/Chip"
import { CellToolbar } from "./CellToolbar"
import { ChartCell } from "./ChartCell"
import { ComparisonCell } from "./ComparisonCell"
import { InsightsCell } from "./InsightsCell"
import { MetricsCell } from "./MetricsCell"
import { NarrativeCell } from "./NarrativeCell"
import { TableCell } from "./TableCell"
import { TitleCell } from "./TitleCell"

// ── Kind-shaped skeletons ─────────────────────────────────────────────────────

function CellSkeleton({ kind }: { kind: AnswerCell["kind"] }) {
  switch (kind) {
    case "title":
      return <div className="h-7 w-2/3 shimmer rounded-ctrl mb-2" />
    case "metrics":
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[88px] shimmer rounded-card" />
          ))}
        </div>
      )
    case "chart":
      return <div className="h-[280px] w-full shimmer rounded-card mb-2" />
    case "table":
      return (
        <div className="mb-2 space-y-1">
          <div className="h-8 w-full shimmer rounded-ctrl" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-full shimmer rounded-ctrl opacity-70" />
          ))}
        </div>
      )
    case "comparison":
      return (
        <div className="mb-2 space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-full shimmer rounded-ctrl" />
          ))}
        </div>
      )
    case "narrative":
      return (
        <div className="mb-2 space-y-2 max-w-[65ch]">
          <div className="h-3 w-full shimmer rounded" />
          <div className="h-3 w-5/6 shimmer rounded" />
          <div className="h-3 w-4/6 shimmer rounded" />
        </div>
      )
    case "insights":
      return (
        <div className="mb-2 space-y-2 border-l-2 border-violet/30 pl-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-4 w-full shimmer rounded" />
          ))}
        </div>
      )
    default:
      return <div className="h-8 shimmer rounded-ctrl mb-2" />
  }
}

// ── Cell inner dispatcher ─────────────────────────────────────────────────────

function CellInner({ cell, sectionQuestion, messageId }: { cell: AnswerCell; sectionQuestion?: string; messageId?: string }) {
  switch (cell.kind) {
    case "title":      return <TitleCell cell={cell} sectionQuestion={sectionQuestion} />
    case "metrics":    return <MetricsCell cell={cell} />
    case "chart":      return <ChartCell cell={cell} />
    case "table":      return <TableCell cell={cell} messageId={messageId} />
    case "comparison": return <ComparisonCell cell={cell} />
    case "narrative":  return <NarrativeCell cell={cell} />
    case "insights":   return <InsightsCell cell={cell} />
    default:           return null
  }
}

// ── Cell wrapper with toolbar + skeleton ─────────────────────────────────────

function CellRenderer({ cell, sectionQuestion, messageId, onRefine }: { cell: AnswerCell; sectionQuestion?: string; messageId?: string; onRefine?: (prompt: string) => void }) {
  if (cell.status === "running") {
    return <CellSkeleton kind={cell.kind} />
  }
  // U7 — a completed cell crossfades up from its skeleton (150ms, 4px rise).
  return (
    <div className="relative group motion-safe:animate-cell-in">
      <CellToolbar cell={cell} messageId={messageId} onRefine={onRefine} />
      <CellInner cell={cell} sectionQuestion={sectionQuestion} messageId={messageId} />
    </div>
  )
}

// ── FLIP layout animation ─────────────────────────────────────────────────────

function useFLIP(deps: unknown[]) {
  const rects = useRef<Map<string, DOMRect>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  const snapshot = useCallback(() => {
    if (!containerRef.current) return
    const children = containerRef.current.querySelectorAll<HTMLElement>("[data-cell-id]")
    children.forEach((el) => {
      const id = el.dataset.cellId!
      rects.current.set(id, el.getBoundingClientRect())
    })
  }, [])

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced || !containerRef.current) return
    const children = containerRef.current.querySelectorAll<HTMLElement>("[data-cell-id]")
    children.forEach((el) => {
      const id = el.dataset.cellId!
      const old = rects.current.get(id)
      if (!old) return
      const next = el.getBoundingClientRect()
      const dy = old.top - next.top
      if (Math.abs(dy) < 1) return
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], {
        duration: 300,
        easing: "ease-out",
        fill: "none",
      })
    })
    rects.current.clear()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { containerRef, snapshot }
}

// ── Section ───────────────────────────────────────────────────────────────────

function SectionView({ section, messageId, onFollowUp }: { section: AnswerSection; messageId?: string; onFollowUp?: (q: string) => void }) {
  const order = section.layout ?? section.cells.map((c) => c.id)
  const cellById = Object.fromEntries(section.cells.map((c) => [c.id, c]))
  const rawOrdered = order.flatMap((id) => (cellById[id] ? [cellById[id]] : []))

  // FIX 1 — a narrative cell identical to the one immediately before it must
  // never render twice.
  let prevNarr = ""
  const orderedCells = rawOrdered.filter((c) => {
    if (c.kind !== "narrative") { prevNarr = ""; return true }
    const ps = (c.payload.paragraphs as string[]) ?? (c.payload.text ? [c.payload.text as string] : [])
    const txt = ps.join("\n\n").trim()
    if (txt && txt === prevNarr) return false
    prevNarr = txt
    return true
  })

  const { containerRef, snapshot } = useFLIP([JSON.stringify(order)])

  // Snapshot before each render so FLIP has before-positions
  useEffect(() => { snapshot() })

  // FIX 4 — agent notes render ONCE per section as a small inline meta row under
  // the title, deduped (no consecutive duplicates), never a full-width banner.
  const seen = new Set<string>()
  const metaNotes = (section.agent_notes ?? []).filter((n) => {
    const key = `${n.kind}::${n.text}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const titleIdx = orderedCells.findIndex((c) => c.kind === "title")

  // TASK 1 — the fallback note is ONE quiet line (12px, caution, warning glyph),
  // never a banner box.
  const NotesRow = metaNotes.length > 0 ? (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 mt-1.5">
      {metaNotes.map((note, i) => (
        <span
          key={i}
          dir="auto"
          className={
            "inline-flex items-center gap-1 text-xs " +
            (note.kind === "fallback_notice" ? "text-caution" : "text-ink-dim")
          }
        >
          <span className="text-[10px] leading-none">{note.kind === "fallback_notice" ? "⚠" : "ℹ"}</span>
          {note.text}
        </span>
      ))}
    </div>
  ) : null

  return (
    <section className="mb-10">
      {/* When there's no title cell, the meta row sits at the top. */}
      {titleIdx < 0 && NotesRow}
      {/* TASK 1 — cells breathe with a 24px rhythm. */}
      <div ref={containerRef} className="flex flex-col gap-6">
        {orderedCells.map((cell, idx) => (
          <div key={cell.id} data-cell-id={cell.id}>
            <CellRenderer cell={cell} sectionQuestion={section.question} messageId={messageId} onRefine={onFollowUp} />
            {idx === titleIdx && NotesRow}
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Canvas ────────────────────────────────────────────────────────────────────

interface Props {
  sections: AnswerSection[]
  followUps?: string[]
  completionText?: string | null
  messageId?: string
  onFollowUp?: (q: string) => void
}

export function SessionCanvas({ sections, followUps, completionText, messageId, onFollowUp }: Props) {
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())

  // Smooth-scroll to a new section's title on section_start
  useEffect(() => {
    const last = sections.at(-1)
    if (!last) return
    const el = sectionRefs.current.get(last.id)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [sections.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!sections.length) return null

  return (
    <div className="w-full max-w-[860px] mx-auto px-4 sm:px-8 py-6">
      {sections.map((section, idx) => (
        <div
          key={section.id}
          ref={(el) => { if (el) sectionRefs.current.set(section.id, el) }}
          className={idx > 0 ? "border-t border-line pt-10" : ""}
          style={{ scrollMarginTop: 96 }}
        >
          <SectionView section={section} messageId={messageId} onFollowUp={onFollowUp} />
        </div>
      ))}

      {/* TASK 5 — section footer: one completion statement, then a FOLLOW UP
          eyebrow with quiet chips. A single hairline above. */}
      {(completionText || (followUps && followUps.length > 0)) && (
        <div className="mt-6 pt-4 border-t border-line">
          {completionText && (
            <p dir="auto" className="text-[0.9375rem] text-ink leading-[1.7] mb-4 max-w-[65ch]">{completionText}</p>
          )}
          {followUps && followUps.length > 0 && (
            <div>
              <p className="text-[11px] text-ink-dim mb-2 font-medium uppercase tracking-wide">Follow up</p>
              <div className="flex flex-wrap gap-2">
                {followUps.slice(0, 3).map((q, i) => (
                  <Chip key={i} onClick={() => onFollowUp?.(q)}>{q}</Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
