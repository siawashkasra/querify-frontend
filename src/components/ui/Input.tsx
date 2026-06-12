import { forwardRef } from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

// U2 — surface field on tokens. Focus shows a 3px violet ring at 18% with the
// border tinted violet; outline suppressed so it never doubles with the global
// :focus-visible ring (U1).
const fieldClasses = cn(
  "w-full h-9 px-3 rounded-ctrl text-sm bg-surface text-ink",
  "border transition-colors duration-[var(--t-fast)] ease-[var(--ease)] outline-none",
  "placeholder:text-ink-dim/70",
  "focus:border-violet focus:ring-[3px] focus:ring-violet/[0.18] focus-visible:outline-none"
)

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-ink-dim">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            fieldClasses,
            error ? "border-alert focus:border-alert focus:ring-alert/[0.18]" : "border-line",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-alert">{error}</p>}
        {!error && helperText && <p className="text-xs text-ink-dim">{helperText}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

export default Input
