"use client"

import * as Tooltip from "@radix-ui/react-tooltip"
import { cn } from "@/lib/cn"
import { useSuggestedQuestions } from "@/hooks/useSuggestedQuestions"
import { useAppStore } from "@/store/appStore"
import type { SuggestedQuestion } from "@/types"

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void
}

function SkeletonChips() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={cn("h-9 rounded-full animate-pulse bg-[var(--surface-3)]", i % 2 === 0 ? "w-52" : "w-40")} />
      ))}
    </>
  )
}

function QuestionChip({ suggestion, onSelect }: { suggestion: SuggestedQuestion; onSelect: (q: string) => void }) {
  const chip = (
    <button
      onClick={() => onSelect(suggestion.question)}
      className={cn(
        "px-4 py-2 rounded-full text-sm border border-[var(--border)] bg-white",
        "text-[var(--text-dim)] hover:border-brand hover:text-brand hover:bg-[var(--brand-light)]",
        "transition-colors"
      )}
    >
      {suggestion.question}
    </button>
  )

  if (!suggestion.reason) return chip

  return (
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger asChild>{chip}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          className="z-50 max-w-xs rounded-md bg-[#1a1a2e] px-3 py-1.5 text-xs text-white shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          {suggestion.reason}
          <Tooltip.Arrow className="fill-[#1a1a2e]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export const SuggestedPrompts = ({ onSelect }: SuggestedPromptsProps) => {
  const { activeConnectionId } = useAppStore()
  const { suggestions, isLoading } = useSuggestedQuestions(activeConnectionId)

  return (
    <Tooltip.Provider>
      <div className="flex flex-col items-center justify-center gap-6 flex-1 px-4 py-12">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--text)]">What would you like to know?</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Select a question or type your own below</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 max-w-xl">
          {isLoading ? (
            <SkeletonChips />
          ) : (
            suggestions.map((s) => <QuestionChip key={s.question} suggestion={s} onSelect={onSelect} />)
          )}
        </div>
      </div>
    </Tooltip.Provider>
  )
}

export default SuggestedPrompts
