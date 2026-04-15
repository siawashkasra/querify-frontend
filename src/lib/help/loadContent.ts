import fs from "fs"
import path from "path"
import matter from "gray-matter"

export type HelpFrontmatter = {
  title: string
  description: string
  updated: string
  readTime: number
  order?: number
}

export type HelpArticleMeta = {
  category: string
  slug: string
  frontmatter: HelpFrontmatter
  content: string
}

const HELP_ROOT = path.join(process.cwd(), "content", "help")

function listCategoryDirs() {
  if (!fs.existsSync(HELP_ROOT)) return []
  return fs.readdirSync(HELP_ROOT).filter((name) => fs.statSync(path.join(HELP_ROOT, name)).isDirectory())
}

export function getArticle(category: string, slug: string): HelpArticleMeta | null {
  const filePath = path.join(HELP_ROOT, category, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, "utf8")
  const { data, content } = matter(raw)
  const frontmatter = data as HelpFrontmatter
  if (!frontmatter.title || !frontmatter.description) return null
  return { category, slug, frontmatter, content }
}

export function getAllArticles(): HelpArticleMeta[] {
  const out: HelpArticleMeta[] = []
  for (const cat of listCategoryDirs()) {
    const dir = path.join(HELP_ROOT, cat)
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"))
    for (const f of files) {
      const slug = f.replace(/\.mdx$/, "")
      const a = getArticle(cat, slug)
      if (a) out.push(a)
    }
  }
  return out.sort((a, b) => {
    const oa = a.frontmatter.order ?? 999
    const ob = b.frontmatter.order ?? 999
    if (oa !== ob) return oa - ob
    return a.frontmatter.title.localeCompare(b.frontmatter.title)
  })
}

export function getArticlesByCategory(categoryId: string) {
  return getAllArticles().filter((a) => a.category === categoryId)
}

export function getPopularInCategory(categoryId: string, limit = 3) {
  return getArticlesByCategory(categoryId).slice(0, limit)
}

export type SearchDoc = {
  category: string
  slug: string
  title: string
  description: string
  searchBlob: string
}

function stripForSearch(s: string) {
  return s.replace(/```[\s\S]*?```/g, " ").replace(/[#*_`[\]]/g, " ").replace(/\s+/g, " ").trim()
}

export function buildSearchIndex(): SearchDoc[] {
  return getAllArticles().map((a) => {
    const plain = stripForSearch(a.content)
    const searchBlob = `${a.frontmatter.title} ${a.frontmatter.description} ${plain.slice(0, 200)}`.slice(0, 5000)
    return {
      category: a.category,
      slug: a.slug,
      title: a.frontmatter.title,
      description: a.frontmatter.description,
      searchBlob,
    }
  })
}

export function getRelatedArticles(category: string, excludeSlug: string, limit = 3) {
  return getArticlesByCategory(category).filter((a) => a.slug !== excludeSlug).slice(0, limit)
}

export function getAllArticleParams() {
  return getAllArticles().map((a) => ({ category: a.category, slug: a.slug }))
}
