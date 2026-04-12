import { forwardRef } from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Loader2 } from "lucide-react"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark border border-brand disabled:opacity-50",
  secondary: "bg-surface-2 text-[var(--text)] hover:bg-surface-3 border border-[var(--border)]",
  ghost: "bg-transparent text-brand border border-brand hover:bg-brand-light/10",
  danger: "bg-danger text-white hover:opacity-90 border border-danger disabled:opacity-50",
}

const sizeClasses: Record<Size, string> = {
  sm: "h-7 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-base gap-2",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, disabled, className, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded font-medium transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mid",
        "disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="animate-spin shrink-0" size={size === "sm" ? 12 : 14} />}
      {children}
    </button>
  )
)
Button.displayName = "Button"

export default Button
