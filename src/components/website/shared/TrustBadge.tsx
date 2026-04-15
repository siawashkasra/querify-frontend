import { cn } from "@/lib/cn"

type TrustBadgeProps = { label: string; className?: string }

export default function TrustBadge({ label, className }: TrustBadgeProps) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-web-brand/25 bg-white px-2.5 py-0.5 text-xs font-medium text-web-brand", className)}>
      {label}
    </span>
  )
}
