"use client"

import { cn } from "@/lib/cn"

const CHIPS = [
  "What is my revenue this month?",
  "How many new users signed up this week?",
  "Which customers are at risk of churning?",
  "Show me revenue by month for the last 6 months",
  "Who are my top 10 customers by value?",
  "What is my current churn rate?",
]

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void
}

export const SuggestedPrompts = ({ onSelect }: SuggestedPromptsProps) => (
  <div className="flex flex-col items-center justify-center gap-6 flex-1 px-4 py-12">
    <div className="text-center">
      <h2 className="text-lg font-semibold text-[var(--text)]">What would you like to know?</h2>
      <p className="text-sm text-[var(--text-muted)] mt-1">Select a question or type your own below</p>
    </div>
    <div className="flex flex-wrap justify-center gap-2 max-w-xl">
      {CHIPS.map((chip) => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className={cn(
            "px-4 py-2 rounded-full text-sm border border-[var(--border)] bg-white",
            "text-[var(--text-dim)] hover:border-brand hover:text-brand hover:bg-[var(--brand-light)]",
            "transition-colors"
          )}
        >
          {chip}
        </button>
      ))}
    </div>
  </div>
)

export default SuggestedPrompts
