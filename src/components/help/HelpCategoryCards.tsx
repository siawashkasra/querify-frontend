import Link from "next/link"
import { Rocket, Server, MessageSquare, CreditCard, Wrench, type LucideIcon } from "lucide-react"
import type { HelpArticleMeta } from "@/lib/help/loadContent"
import type { HelpCategoryDef } from "@/lib/help/categories"

const ICONS: Record<HelpCategoryDef["icon"], LucideIcon> = {
  Rocket,
  Server,
  MessageSquare,
  CreditCard,
  Wrench,
}

export default function HelpCategoryCards({ categories }: { categories: { def: HelpCategoryDef; articles: HelpArticleMeta[]; popular: HelpArticleMeta[] }[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {categories.map(({ def, articles, popular }) => {
        const Icon = ICONS[def.icon]
        return (
          <div key={def.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-web-brand-light text-web-brand">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              <Link href={`/help/${def.id}`} className="hover:text-web-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">{def.name}</Link>
            </h2>
            <p className="mt-1 text-sm text-slate-600">{articles.length} {articles.length === 1 ? "article" : "articles"}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-3">{def.description}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Popular</p>
            <ul className="mt-2 flex flex-col gap-2">
              {popular.map((a) => (
                <li key={a.slug}>
                  <Link href={`/help/${def.id}/${a.slug}`} className="text-sm font-medium text-web-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm line-clamp-2">
                    {a.frontmatter.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
