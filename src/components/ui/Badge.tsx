import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

type BadgeVariant = "active" | "degraded" | "inactive" | "pending" | "default"

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  active: "bg-success/15 text-success border-success/30",
  degraded: "bg-warning/15 text-warning border-warning/30",
  inactive: "bg-[var(--text-muted)]/15 text-[var(--text-muted)] border-[var(--text-muted)]/30",
  pending: "bg-brand/15 text-brand-mid border-brand/30",
  default: "bg-surface-2 text-[var(--text-dim)] border-[var(--border)]",
}

export const Badge = ({ variant = "default", children, className }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border",
      variantClasses[variant],
      className
    )}
  >
    {children}
  </span>
)

export default Badge
