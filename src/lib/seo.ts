import type { Metadata } from "next"

export const DEFAULT_TITLE = "Querify — Ask your database anything"
export const DEFAULT_DESCRIPTION =
  "Connect your database and ask business questions in plain English. No SQL, no dashboards. Get answers in seconds."

export function getSiteUrl(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL
  if (u && u.startsWith("http")) return u.replace(/\/$/, "")
  return "https://querify.app"
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl()
  const p = path.startsWith("/") ? path : `/${path}`
  return `${base}${p}`
}

export function ogImageUrl(): string {
  return absoluteUrl("/opengraph-image")
}

export const PAGE_SEO = {
  pricing: {
    title: "Pricing — Querify",
    description:
      "Simple, honest pricing for Querify. Start free, then choose Starter, Pro, or Team. No surprise fees — connect your database and ask questions in plain English.",
  },
  security: {
    title: "Security — Querify",
    description:
      "How Querify protects your database credentials, uses read-only access, and keeps your data yours. Security overview for teams evaluating Querify.",
  },
  howItWorks: {
    title: "How it works — Querify",
    description:
      "From connection to answers: how Querify connects to PostgreSQL, understands your schema, and turns plain-English questions into insights — no SQL required.",
  },
  help: {
    title: "Help center — Querify",
    description:
      "Guides for getting started, database setup, using Querify, account and billing, and troubleshooting. Search articles or browse by topic.",
  },
} as const

type CreateMetadataInput = {
  title: string
  description: string
  path?: string
  ogImage?: string
  noIndex?: boolean
}

export function createMetadata(input: CreateMetadataInput): Metadata {
  const base = getSiteUrl()
  const url = input.path ? absoluteUrl(input.path) : base
  const image = input.ogImage ?? ogImageUrl()
  return {
    title: { absolute: input.title },
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Querify",
      url,
      title: input.title,
      description: input.description,
      images: [{ url: image, width: 1200, height: 630, alt: "Querify" }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@querify",
      title: input.title,
      description: input.description,
      images: [image],
    },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  }
}

export function mergeRootMetadata(): Metadata {
  const base = getSiteUrl()
  const img = ogImageUrl()
  return {
    metadataBase: new URL(base),
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Querify",
      url: base,
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: [{ url: img, width: 1200, height: 630, alt: "Querify" }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@querify",
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: [img],
    },
    robots: { index: true, follow: true },
  }
}
