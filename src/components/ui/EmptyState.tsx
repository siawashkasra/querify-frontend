import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { LucideIcon } from "lucide-react"
import Button from "./Button"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

interface EmptyStateProps {
  icon?: LucideIcon
  heading: string
  body?: string
  ctaLabel?: string
  onCta?: () => void
  className?: string
}

export const EmptyState = ({ icon: Icon, heading, body, ctaLabel, onCta, className }: EmptyStateProps) => (
  <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}>
    {Icon && (
      <div className="flex h-12 w-12 items-center justify-center rounded-card bg-paper border border-line">
        <Icon size={22} className="text-ink-dim" />
      </div>
    )}
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-ink">{heading}</p>
      {body && <p className="text-xs text-ink-dim max-w-xs">{body}</p>}
    </div>
    {ctaLabel && onCta && (
      <Button size="sm" onClick={onCta}>{ctaLabel}</Button>
    )}
  </div>
)

export default EmptyState
