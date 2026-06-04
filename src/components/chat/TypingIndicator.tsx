"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/cn"

const STAGES = [
  "Reading your question...",
  "Generating SQL...",
  "Running query...",
  "Summarising results...",
]

export const TypingIndicator = ({ stage: liveStage }: { stage?: string } = {}) => {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    if (liveStage) return  // real streamed stage text takes over from the timed fallback
    const interval = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2000)
    return () => clearInterval(interval)
  }, [liveStage])

  return (
    <div data-testid="typing-indicator" className="flex items-start gap-3 py-3">
      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-[var(--surface-3)] border border-[var(--border)] shrink-0 mt-0.5">
        <span className="text-xs font-bold text-brand">Q</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 h-8 px-4 rounded-2xl rounded-tl-sm bg-[var(--surface-2)] border border-[var(--border)]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn("h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] animate-bounce")}
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] pl-1 transition-all">{liveStage || STAGES[stage]}</p>
      </div>
    </div>
  )
}

export default TypingIndicator
