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

// U2 — variants on U1 tokens. No gradients anywhere; hover darkens via
// brightness (keeps the no-hex-outside-tokens rule); active nudges down 1px.
const variantClasses: Record<Variant, string> = {
  primary: "bg-violet text-white border border-violet hover:brightness-[0.94] active:translate-y-px",
  secondary: "bg-surface text-ink border border-line hover:border-violet/40 active:translate-y-px",
  ghost: "bg-transparent text-ink-dim border border-transparent hover:bg-violet-soft hover:text-ink",
  danger: "bg-alert text-white border border-alert hover:brightness-[0.94] active:translate-y-px",
}

const sizeClasses: Record<Size, string> = {
  sm: "h-7 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-1.5",
  lg: "h-11 px-6 text-base gap-2",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, disabled, className, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-ctrl font-medium cursor-pointer",
        "transition-[background-color,border-color,filter,transform] duration-[var(--t-fast)] ease-[var(--ease)]",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 disabled:active:translate-y-0",
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
