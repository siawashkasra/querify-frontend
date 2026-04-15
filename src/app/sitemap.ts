import type { MetadataRoute } from "next"
import { HELP_CATEGORIES } from "@/lib/help/categories"
import { getAllArticles } from "@/lib/help/loadContent"
import { getAllPosts } from "@/lib/blog/loadBlog"
import { getSiteUrl } from "@/lib/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl()
  const now = new Date()
  const staticMarketing: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/security`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/help`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/forgot-password`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ]
  const helpCategories: MetadataRoute.Sitemap = HELP_CATEGORIES.map((c) => ({
    url: `${base}/help/${c.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }))
  const helpArticles: MetadataRoute.Sitemap = getAllArticles().map((a) => {
    let lastModified = now
    try {
      lastModified = new Date(a.frontmatter.updated)
    } catch {}
    return {
      url: `${base}/help/${a.category}/${a.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }
  })
  const blogPosts: MetadataRoute.Sitemap = getAllPosts().map((p) => {
    let lastModified = now
    try {
      lastModified = new Date(p.frontmatter.updated ?? p.frontmatter.date)
    } catch {}
    return {
      url: `${base}/blog/${p.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }
  })
  return [...staticMarketing, ...helpCategories, ...helpArticles, ...blogPosts]
}
