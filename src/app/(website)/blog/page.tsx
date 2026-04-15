import Link from "next/link"
import type { Metadata } from "next"
import { createMetadata } from "@/lib/seo"
import { getCategories, getPostsFiltered, paginatePosts } from "@/lib/blog/loadBlog"
import { format, parseISO } from "date-fns"

const PER_PAGE = 12

export const metadata: Metadata = createMetadata({
  title: "Blog — Querify",
  description: "Product updates, data tips, and stories from the Querify team. New articles are added regularly.",
  path: "/blog",
})

function formatDate(iso: string) {
  try {
    return format(parseISO(iso), "MMMM d, yyyy")
  } catch {
    return iso
  }
}

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ page?: string; category?: string }> }) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1)
  const category = sp.category?.trim() || ""
  const categories = getCategories()
  const filtered = getPostsFiltered(category || null)
  const { items, totalPages, total } = paginatePosts(filtered, page, PER_PAGE)
  const buildQuery = (nextPage: number, cat: string) => {
    const q = new URLSearchParams()
    if (cat) q.set("category", cat)
    if (nextPage > 1) q.set("page", String(nextPage))
    const s = q.toString()
    return s ? `/blog?${s}` : "/blog"
  }
  return (
    <div className="px-4 pb-20 pt-10 md:pt-14">
      <h1 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Blog</h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-slate-600">Ideas for founders who live in their data.</p>
      <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-2">
        <Link href="/blog" className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand ${!category ? "bg-web-brand text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
          All
        </Link>
        {categories.map((c) => (
          <Link key={c} href={c === category ? "/blog" : `/blog?category=${encodeURIComponent(c)}`} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand ${c === category ? "bg-web-brand text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
            {c}
          </Link>
        ))}
      </div>
      {total === 0 ? (
        <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <p className="text-lg font-semibold text-slate-900">Articles coming soon.</p>
          <p className="mt-3 text-slate-600">
            Follow us on{" "}
            <a href="https://twitter.com/querify" target="_blank" rel="noopener noreferrer" className="font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
              Twitter
            </a>{" "}
            for updates.
          </p>
        </div>
      ) : (
        <>
          <ul className="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-2">
            {items.map((post) => (
              <li key={post.slug}>
                <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-wide text-web-brand">{post.frontmatter.category}</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    <Link href={`/blog/${post.slug}`} className="hover:text-web-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
                      {post.frontmatter.title}
                    </Link>
                  </h2>
                  <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                    <time dateTime={post.frontmatter.date}>{formatDate(post.frontmatter.date)}</time>
                    <span aria-hidden>·</span>
                    <span>{post.frontmatter.readTime} min read</span>
                  </p>
                  <p className="mt-4 flex-1 text-slate-600">{post.frontmatter.description}</p>
                  <Link href={`/blog/${post.slug}`} className="mt-6 inline-flex text-sm font-semibold text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
                    Read article →
                  </Link>
                </article>
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <nav className="mx-auto mt-12 flex max-w-5xl items-center justify-center gap-4" aria-label="Pagination">
              {page > 1 ? (
                <Link href={buildQuery(page - 1, category)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand">
                  Previous
                </Link>
              ) : (
                <span className="rounded-lg border border-transparent px-4 py-2 text-sm text-slate-400">Previous</span>
              )}
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={buildQuery(page + 1, category)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand">
                  Next
                </Link>
              ) : (
                <span className="rounded-lg border border-transparent px-4 py-2 text-sm text-slate-400">Next</span>
              )}
            </nav>
          ) : null}
        </>
      )}
    </div>
  )
}
