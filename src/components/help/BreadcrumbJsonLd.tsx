import { getSiteUrl } from "@/lib/help/siteUrl"

type Crumb = { name: string; path: string }

export default function BreadcrumbJsonLd({ items }: { items: Crumb[] }) {
  const base = getSiteUrl()
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${base}${it.path.startsWith("/") ? it.path : `/${it.path}`}`,
    })),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}
