import Link from "next/link"
import type { HelpArticleMeta } from "@/lib/help/loadContent"
import { getCategoryById } from "@/lib/help/categories"

export default function RelatedArticles({ articles }: { articles: HelpArticleMeta[] }) {
  if (!articles.length) return null
  return (
    <aside className="rounded-xl border border-slate-200 bg-slate-50/80 p-6 lg:sticky lg:top-24">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Related articles</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {articles.map((a) => {
          const cat = getCategoryById(a.category)
          return (
            <li key={a.slug}>
              <Link href={`/help/${a.category}/${a.slug}`} className="font-medium text-slate-900 underline-offset-2 hover:text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
                {a.frontmatter.title}
              </Link>
              <span className="mt-0.5 block text-xs text-slate-500">{cat?.name}</span>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
