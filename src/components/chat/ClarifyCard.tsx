"use client"

// ClarifyCard — a NORMAL assistant response for ambiguous/declined questions.
// One sentence + the closest verified measures as tappable suggestion chips.
// Deliberately NOT a red error card; error cards are reserved for actual
// failures. A "Try again" button re-runs the original question.

import { Sparkles, RotateCcw } from "lucide-react"

interface Props {
  message: string
  suggestions?: string[]
  onSuggestion?: (text: string) => void
  onRetry?: () => void
}

export function ClarifyCard({ message, suggestions, onSuggestion, onRetry }: Props) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm px-5 py-4">
      <div className="flex items-start gap-2.5">
        <span className="flex-shrink-0 mt-0.5 text-violet-500">
          <Sparkles size={15} />
        </span>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{message}</p>
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 pl-7">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion?.(s)}
              className="text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {onRetry && (
        <div className="mt-3 pl-7">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
