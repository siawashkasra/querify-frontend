import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

// U2 — pill badges on tokens. Four canonical tones (neutral/verify/caution/
// alert) plus a violet tone, and legacy status aliases kept so existing
// call-sites don't change. Confidence: high->verify, medium->caution.
type BadgeTone = "neutral" | "verify" | "caution" | "alert" | "violet"
type LegacyVariant = "active" | "degraded" | "inactive" | "pending" | "default"
type BadgeVariant = BadgeTone | LegacyVariant

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-line/60 text-ink-dim",
  verify: "bg-verify/12 text-verify",
  caution: "bg-caution/12 text-caution",
  alert: "bg-alert/12 text-alert",
  violet: "bg-violet-soft text-violet",
}

// Legacy status names map onto canonical tones.
const legacyAlias: Record<LegacyVariant, BadgeTone> = {
  active: "verify",
  degraded: "caution",
  inactive: "neutral",
  pending: "violet",
  default: "neutral",
}

function resolveTone(variant: BadgeVariant): BadgeTone {
  return variant in toneClasses
    ? (variant as BadgeTone)
    : legacyAlias[variant as LegacyVariant]
}

export const Badge = ({ variant = "neutral", children, className }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-medium",
      toneClasses[resolveTone(variant)],
      className
    )}
  >
    {children}
  </span>
)

export default Badge
