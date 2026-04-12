"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/cn"
import type { KPICard as KPICardType } from "@/types"

interface KPICardsProps {
  cards: KPICardType[]
}

function formatValue(value: number | string): string {
  if (typeof value === "number") {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 })
  }
  return String(value)
}

export const KPICards = ({ cards }: KPICardsProps) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {cards.slice(0, 4).map((card, i) => {
      const delta = card.delta ?? 0
      const direction = delta > 0 ? "up" : delta < 0 ? "down" : "neutral"
      return (
        <div
          key={i}
          className="flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-white p-3"
        >
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider truncate">
            {card.label}
          </span>
          <span className="text-2xl font-semibold font-mono text-brand leading-tight">
            {formatValue(card.value)}
          </span>
          {card.delta != null && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              direction === "up" && "text-success",
              direction === "down" && "text-danger",
              direction === "neutral" && "text-[var(--text-muted)]",
            )}>
              {direction === "up" && <TrendingUp size={12} />}
              {direction === "down" && <TrendingDown size={12} />}
              {direction === "neutral" && <Minus size={12} />}
              <span>{delta > 0 ? "+" : ""}{delta}%</span>
              {card.delta_label && <span className="text-[var(--text-muted)]">{card.delta_label}</span>}
            </div>
          )}
        </div>
      )
    })}
  </div>
)

export default KPICards
