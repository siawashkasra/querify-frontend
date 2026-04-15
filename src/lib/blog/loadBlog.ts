import fs from "fs"
import path from "path"
import matter from "gray-matter"

export type BlogFrontmatter = {
  title: string
  description: string
  date: string
  updated?: string
  category: string
  readTime: number
  author: string
}

export type BlogPostMeta = {
  slug: string
  frontmatter: BlogFrontmatter
  content: string
}

const BLOG_ROOT = path.join(process.cwd(), "content", "blog")

export function getPost(slug: string): BlogPostMeta | null {
  const filePath = path.join(BLOG_ROOT, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, "utf8")
  const { data, content } = matter(raw)
  const frontmatter = data as BlogFrontmatter
  if (!frontmatter.title || !frontmatter.description || !frontmatter.date || !frontmatter.category || !frontmatter.author) return null
  if (typeof frontmatter.readTime !== "number") return null
  return { slug, frontmatter, content }
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_ROOT)) return []
  const files = fs.readdirSync(BLOG_ROOT).filter((f) => f.endsWith(".mdx"))
  const out: BlogPostMeta[] = []
  for (const f of files) {
    const slug = f.replace(/\.mdx$/, "")
    const p = getPost(slug)
    if (p) out.push(p)
  }
  return out.sort((a, b) => {
    const ta = Date.parse(a.frontmatter.date)
    const tb = Date.parse(b.frontmatter.date)
    if (tb !== ta) return tb - ta
    return a.frontmatter.title.localeCompare(b.frontmatter.title)
  })
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((p) => p.slug)
}

export function getCategories(): string[] {
  const s = new Set<string>()
  for (const p of getAllPosts()) s.add(p.frontmatter.category)
  return [...s].sort((a, b) => a.localeCompare(b))
}

export function getPostsFiltered(category: string | null): BlogPostMeta[] {
  const all = getAllPosts()
  if (!category) return all
  return all.filter((p) => p.frontmatter.category === category)
}

export function paginatePosts(posts: BlogPostMeta[], page: number, perPage: number): { items: BlogPostMeta[]; totalPages: number; total: number } {
  const total = posts.length
  const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / perPage))
  const p = Math.min(Math.max(1, page), totalPages)
  const start = (p - 1) * perPage
  const items = posts.slice(start, start + perPage)
  return { items, totalPages, total }
}

export function getRelatedPosts(slug: string, category: string, limit = 3): BlogPostMeta[] {
  return getAllPosts().filter((p) => p.slug !== slug && p.frontmatter.category === category).slice(0, limit)
}

export function extractToc(content: string): { id: string; text: string }[] {
  const lines = content.split(/\r?\n/)
  const out: { id: string; text: string }[] = []
  const seen = new Map<string, number>()
  for (const line of lines) {
    const m = /^## (.+)$/.exec(line.trim())
    if (!m) continue
    const text = m[1].trim().replace(/\s+#+\s*$/, "")
    let id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section"
    const n = (seen.get(id) ?? 0) + 1
    seen.set(id, n)
    if (n > 1) id = `${id}-${n}`
    out.push({ id, text })
  }
  return out
}
