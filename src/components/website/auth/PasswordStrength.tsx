import { cn } from "@/lib/cn"

function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: "Weak", color: "bg-red-400" }
  if (score <= 2) return { score, label: "Fair", color: "bg-amber-400" }
  if (score <= 3) return { score, label: "Good", color: "bg-blue-400" }
  return { score, label: "Strong", color: "bg-emerald-500" }
}

export default function PasswordStrength({ password }: { password: string }) {
  const { score, label, color } = getStrength(password)
  const bars = 4

  return (
    <div className="flex items-center gap-2" aria-label={`Password strength: ${label}`}>
      <div className="flex flex-1 gap-1">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < Math.ceil((score / 5) * bars) ? color : "bg-slate-200"
            )}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-slate-500 w-10 text-right">{label}</span>
    </div>
  )
}
