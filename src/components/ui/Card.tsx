import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

interface CardProps {
  children: React.ReactNode
  header?: React.ReactNode
  className?: string
  bodyClassName?: string
}

// U2 — resting card: surface, one hairline, card radius, the rest shadow.
// Floating surfaces (popover/menu/toast) use --shadow-float and no border.
export const Card = ({ children, header, className, bodyClassName }: CardProps) => (
  <div className={cn("rounded-card border border-line bg-surface shadow-rest", className)}>
    {header && (
      <div className="px-5 py-3.5 border-b border-line text-sm font-medium text-ink">
        {header}
      </div>
    )}
    <div className={cn("p-5", bodyClassName)}>{children}</div>
  </div>
)

export default Card
