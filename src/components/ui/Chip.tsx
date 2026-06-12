import { forwardRef } from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected/mention chip: violet-soft fill, no border. */
  selected?: boolean
  /** Optional small kind glyph rendered before the label (mention chips). */
  leading?: React.ReactNode
}

// U2 — suggestion / follow-up chip. A pill that reads as a quiet affordance at
// rest and lights violet on hover; the selected/mention form is filled violet.
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ selected, leading, className, children, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[0.8125rem] cursor-pointer",
        "transition-[background-color,border-color,color,transform] duration-[var(--t-fast)] ease-[var(--ease)]",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
        selected
          ? "bg-violet-soft text-violet border border-transparent"
          : "bg-surface text-ink-dim border border-line hover:border-violet hover:text-violet hover:bg-violet-soft/40",
        className
      )}
      {...props}
    >
      {leading}
      {children}
    </button>
  )
)
Chip.displayName = "Chip"

export default Chip
