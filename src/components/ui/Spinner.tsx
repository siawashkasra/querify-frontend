import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

interface SpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = { sm: "h-4 w-4 border-2", md: "h-6 w-6 border-2", lg: "h-8 w-8 border-[3px]" }

export const Spinner = ({ size = "md", className }: SpinnerProps) => (
  <div
    className={cn(
      "rounded-full border-brand/20 border-t-brand animate-spin",
      sizeClasses[size],
      className
    )}
  />
)

export default Spinner
