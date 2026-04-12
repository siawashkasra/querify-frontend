import { forwardRef } from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[var(--text-dim)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full h-9 px-3 rounded text-sm bg-surface text-[var(--text)]",
            "border transition-colors outline-none",
            "placeholder:text-[var(--text-muted)]",
            "focus:ring-2 focus:ring-brand-mid focus:border-brand",
            error ? "border-danger focus:ring-danger" : "border-[var(--border)]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {!error && helperText && <p className="text-xs text-[var(--text-muted)]">{helperText}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

export default Input
