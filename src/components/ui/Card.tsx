import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

interface CardProps {
  children: React.ReactNode
  header?: React.ReactNode
  className?: string
  bodyClassName?: string
}

export const Card = ({ children, header, className, bodyClassName }: CardProps) => (
  <div className={cn("rounded-lg border border-[var(--border)] bg-surface-2", className)}>
    {header && (
      <div className="px-5 py-3.5 border-b border-[var(--border)] text-sm font-medium text-[var(--text)]">
        {header}
      </div>
    )}
    <div className={cn("p-5", bodyClassName)}>{children}</div>
  </div>
)

export default Card
