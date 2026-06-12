"use client"

// ClarifyCard — a NORMAL assistant response for ambiguous/declined questions.
// U9 decline/clarify standard: ONE sentence + up to 3 nearest verified measures
// as tappable chips. No vocabulary dumps, no internal names, no apologies.
// Deliberately NOT a red error card; error cards are reserved for actual
// failures. A "Try again" link re-runs the original question.

import { Sparkles, RotateCcw } from "lucide-react"
import { Chip } from "@/components/ui/Chip"
import { labelize } from "@/lib/labelize"

interface Props {
  message: string
  suggestions?: string[]
  onSuggestion?: (text: string) => void
  onRetry?: () => void
}

export function ClarifyCard({ message, suggestions, onSuggestion, onRetry }: Props) {
  // At most three chips — never a vocabulary dump. Only humanize raw names
  // (snake_case / single tokens); leave natural-language questions untouched.
  const display = (s: string) => (/[_]|^\S+$/.test(s) ? labelize(s) : s)
  const chips = (suggestions ?? []).slice(0, 3)
  return (
    <div className="bg-surface border border-line rounded-card shadow-rest px-5 py-4">
      <div className="flex items-start gap-2.5">
        <span className="flex-shrink-0 mt-0.5 text-violet">
          <Sparkles size={15} />
        </span>
        <p dir="auto" className="text-[0.9375rem] text-ink leading-relaxed">{message}</p>
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 pl-7">
          {chips.map((s) => (
            <Chip key={s} onClick={() => onSuggestion?.(s)}>{display(s)}</Chip>
          ))}
        </div>
      )}

      {onRetry && (
        <div className="mt-3 pl-7">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-xs text-ink-dim hover:text-ink transition-colors"
          >
            <RotateCcw size={11} />
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

export default ClarifyCard
