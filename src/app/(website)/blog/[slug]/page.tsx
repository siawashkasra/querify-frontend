import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { format, parseISO } from "date-fns"
import { absoluteUrl, createMetadata } from "@/lib/seo"
import { extractToc, getAllSlugs, getPost, getRelatedPosts } from "@/lib/blog/loadBlog"
import BlogMarkdown from "@/components/blog/BlogMarkdown"
import BlogShare from "@/components/blog/BlogShare"
import BlogPostingJsonLd from "@/components/seo/BlogPostingJsonLd"

export const dynamicParams = false

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: { absolute: "Blog — Querify" } }
  return createMetadata({
    title: `${post.frontmatter.title} — Querify Blog`,
    description: post.frontmatter.description,
    path: `/blog/${slug}`,
  })
}

function formatDate(iso: string) {
  try {
    return format(parseISO(iso), "MMMM d, yyyy")
  } catch {
    return iso
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()
  const toc = extractToc(post.content)
  const related = getRelatedPosts(slug, post.frontmatter.category, 3)
  const url = absoluteUrl(`/blog/${slug}`)
  const datePublished = post.frontmatter.date
  const dateModified = post.frontmatter.updated ?? post.frontmatter.date
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 md:pt-14">
      <BlogPostingJsonLd title={post.frontmatter.title} description={post.frontmatter.description} path={`/blog/${slug}`} datePublished={datePublished} dateModified={dateModified} author={post.frontmatter.author} />
      <nav className="text-sm text-slate-500">
        <Link href="/blog" className="font-medium text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
          Blog
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-slate-700">{post.frontmatter.title}</span>
      </nav>
      <header className="mt-6 border-b border-slate-200 pb-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-web-brand">{post.frontmatter.category}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">{post.frontmatter.title}</h1>
        <p className="mt-4 text-lg text-slate-600">{post.frontmatter.description}</p>
        <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{post.frontmatter.author}</span>
          <span aria-hidden>·</span>
          <time dateTime={datePublished}>{formatDate(datePublished)}</time>
          <span aria-hidden>·</span>
          <span>{post.frontmatter.readTime} min read</span>
        </p>
      </header>
      {toc.length > 0 ? (
        <nav className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:hidden" aria-label="Table of contents">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">On this page</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="inline-block rounded-md bg-white px-2 py-1 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-web-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand">
                  {t.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
        <div className="min-w-0">
          <BlogMarkdown content={post.content} toc={toc} />
          <BlogShare url={url} title={post.frontmatter.title} />
          <section className="mt-12 rounded-2xl border border-web-brand/25 bg-web-brand-light/40 px-6 py-10 text-center">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Try Querify free — no SQL required</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-600">Connect your database and ask your first question in minutes.</p>
            <Link href="/signup" className="mt-6 inline-flex rounded-lg bg-web-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-web-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2">
              Get started
            </Link>
          </section>
        </div>
        {toc.length > 0 ? (
          <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">On this page</p>
            <nav aria-label="Table of contents" className="mt-3">
              <ul className="space-y-2 border-l border-slate-200 pl-4">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="text-sm font-medium text-slate-600 transition-colors hover:text-web-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
                      {t.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        ) : null}
      </div>
      {related.length > 0 ? (
        <section className="mt-16 border-t border-slate-200 pt-12">
          <h2 className="text-xl font-bold text-slate-900">Related posts</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/blog/${r.slug}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand">
                  <p className="text-xs font-semibold uppercase text-web-brand">{r.frontmatter.category}</p>
                  <p className="mt-2 font-semibold text-slate-900">{r.frontmatter.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{formatDate(r.frontmatter.date)} · {r.frontmatter.readTime} min read</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
