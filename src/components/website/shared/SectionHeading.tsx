import { cn } from "@/lib/cn"

type SectionHeadingProps = { eyebrow?: string; title: string; description?: string; align?: "left" | "center"; className?: string }

export default function SectionHeading({ eyebrow, title, description, align = "left", className }: SectionHeadingProps) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {eyebrow && <p className="text-sm font-semibold uppercase tracking-wide text-web-brand">{eyebrow}</p>}
      <h2 className={cn("mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl", eyebrow && "mt-2")}>{title}</h2>
      {description && <p className={cn("mt-3 text-base text-slate-600", align === "center" && "mx-auto max-w-2xl")}>{description}</p>}
    </div>
  )
}
