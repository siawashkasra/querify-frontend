import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/cn"

type FeatureCardProps = { icon: LucideIcon; title: string; description: string; className?: string }

export default function FeatureCard({ icon: Icon, title, description, className }: FeatureCardProps) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-web-brand-light text-web-brand">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  )
}
