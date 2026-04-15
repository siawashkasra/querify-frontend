import Link from "next/link"
import { Check } from "lucide-react"
import { cn } from "@/lib/cn"

type PricingCardProps = {
  name: string
  priceLabel: string
  description: string
  features: string[]
  ctaLabel: string
  ctaHref: string
  highlighted?: boolean
  className?: string
}

export default function PricingCard({ name, priceLabel, description, features, ctaLabel, ctaHref, highlighted, className }: PricingCardProps) {
  return (
    <div className={cn("flex flex-col rounded-2xl border p-8", highlighted ? "border-web-brand bg-web-brand-light/30 shadow-lg ring-1 ring-web-brand/20" : "border-slate-200 bg-white shadow-sm", className)}>
      <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{priceLabel}</p>
      <ul className="mt-6 flex flex-col gap-3 text-sm text-slate-700">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className="h-5 w-5 shrink-0 text-web-brand" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={cn(
          "mt-8 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2",
          highlighted ? "bg-web-brand text-white hover:bg-web-brand-dark" : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
        )}
      >
        {ctaLabel}
      </Link>
    </div>
  )
}
