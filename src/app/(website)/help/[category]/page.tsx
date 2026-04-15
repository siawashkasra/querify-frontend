import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HELP_CATEGORIES, getCategoryById } from "@/lib/help/categories"
import { createMetadata } from "@/lib/seo"
import { getArticlesByCategory } from "@/lib/help/loadContent"
import HelpBreadcrumb from "@/components/help/HelpBreadcrumb"
import BreadcrumbJsonLd from "@/components/help/BreadcrumbJsonLd"

export function generateStaticParams() {
  return HELP_CATEGORIES.map((c) => ({ category: c.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const def = getCategoryById(category)
  if (!def) return { title: { absolute: "Help · Querify" } }
  return createMetadata({
    title: `${def.name} · Help · Querify`,
    description: def.description,
    path: `/help/${category}`,
  })
}

export default async function HelpCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const def = getCategoryById(category)
  if (!def) notFound()
  const articles = getArticlesByCategory(category)
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 md:pb-24 md:pt-12">
      <BreadcrumbJsonLd items={[{ name: "Help", path: "/help" }, { name: def.name, path: `/help/${category}` }]} />
      <HelpBreadcrumb items={[{ label: "Help", href: "/help" }, { label: def.name }]} />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{def.name}</h1>
      <p className="mt-3 text-lg text-slate-600">{def.description}</p>
      <ul className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-8">
        {articles.map((a) => (
          <li key={a.slug} className="border-b border-slate-100 pb-6 last:border-0">
            <Link href={`/help/${category}/${a.slug}`} className="text-xl font-semibold text-slate-900 hover:text-web-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
              {a.frontmatter.title}
            </Link>
            <p className="mt-2 text-slate-600">{a.frontmatter.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
