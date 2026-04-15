import { notFound } from "next/navigation"
import { format, parseISO } from "date-fns"
import { getArticle, getAllArticleParams, getRelatedArticles } from "@/lib/help/loadContent"
import { getCategoryById } from "@/lib/help/categories"
import MarkdownArticle from "@/components/help/MarkdownArticle"
import HelpBreadcrumb from "@/components/help/HelpBreadcrumb"
import BreadcrumbJsonLd from "@/components/help/BreadcrumbJsonLd"
import ArticleFeedback from "@/components/help/ArticleFeedback"
import RelatedArticles from "@/components/help/RelatedArticles"

export function generateStaticParams() {
  return getAllArticleParams()
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params
  const article = getArticle(category, slug)
  if (!article) return { title: "Help · Querify" }
  return { title: `${article.frontmatter.title} · Querify Help`, description: article.frontmatter.description }
}

export default async function HelpArticlePage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params
  const article = getArticle(category, slug)
  const cat = getCategoryById(category)
  if (!article || !cat) notFound()
  const related = getRelatedArticles(category, slug, 3)
  let dateLabel = article.frontmatter.updated
  try {
    dateLabel = format(parseISO(article.frontmatter.updated), "MMMM d, yyyy")
  } catch {
    dateLabel = article.frontmatter.updated
  }
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:pb-24 md:pt-12">
      <BreadcrumbJsonLd items={[{ name: "Help", path: "/help" }, { name: cat.name, path: `/help/${category}` }, { name: article.frontmatter.title, path: `/help/${category}/${slug}` }]} />
      <HelpBreadcrumb items={[{ label: "Help", href: "/help" }, { label: cat.name, href: `/help/${category}` }, { label: article.frontmatter.title }]} />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{article.frontmatter.title}</h1>
      <p className="mt-3 text-sm text-slate-500">Updated {dateLabel} · {article.frontmatter.readTime} min read</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_280px] lg:items-start">
        <div className="min-w-0">
          <MarkdownArticle content={article.content} />
          <div className="mt-12">
            <ArticleFeedback />
          </div>
          <p className="mt-8 text-center text-slate-600 lg:text-left">
            Still need help?{" "}
            <a href="mailto:support@querify.ai" className="font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
              Email support@querify.ai
            </a>
          </p>
        </div>
        <RelatedArticles articles={related} />
      </div>
    </div>
  )
}
