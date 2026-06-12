"use client"

import { useEffect, useState } from "react"
import { stageMicrocopy } from "@/lib/stageMicrocopy"

// U7 — the stage line. One calm sentence with a 2px violet pulse dot; text comes
// from real stage events run through the microcopy map. Never a spinner row,
// never fake steps.
const FALLBACK_STAGES = ["routing", "spec", "execute", "analyse"]

export const TypingIndicator = ({ stage: liveStage, connectionName }: { stage?: string; connectionName?: string } = {}) => {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (liveStage) return // real streamed stage text takes over from the timed fallback
    const interval = setInterval(() => setIdx((s) => Math.min(s + 1, FALLBACK_STAGES.length - 1)), 2000)
    return () => clearInterval(interval)
  }, [liveStage])

  const text = stageMicrocopy(liveStage || FALLBACK_STAGES[idx], connectionName)

  return (
    <div data-testid="typing-indicator" className="flex items-center gap-2 py-2">
      <span className="h-1.5 w-1.5 rounded-full bg-violet animate-pulse-ring" />
      <p className="text-xs text-ink-dim transition-all">{text}</p>
    </div>
  )
}

export default TypingIndicator
