import { Check } from "lucide-react"
import { cn } from "@/lib/cn"

interface StepperProps {
  steps: string[]
  current: number
}

export const Stepper = ({ steps, current }: StepperProps) => (
  <div className="flex items-center gap-2 w-full">
    {steps.map((label, i) => {
      const done = i < current
      const active = i === current
      return (
        <div key={label} className="flex items-center gap-2 flex-1">
          <div className={cn(
            "flex items-center justify-center h-7 w-7 rounded-full shrink-0 text-xs font-semibold transition-colors",
            done && "bg-success text-white",
            active && "bg-brand text-white",
            !done && !active && "bg-surface-2 text-[var(--text-muted)] border border-[var(--border)]"
          )}>
            {done ? <Check size={14} /> : i + 1}
          </div>
          <span className={cn(
            "text-xs font-medium truncate hidden sm:block",
            active ? "text-[var(--text)]" : "text-[var(--text-muted)]"
          )}>
            {label}
          </span>
          {i < steps.length - 1 && (
            <div className={cn("flex-1 h-px", done ? "bg-success" : "bg-[var(--border)]")} />
          )}
        </div>
      )
    })}
  </div>
)

export default Stepper
