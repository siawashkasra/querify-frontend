import JsonLd from "./JsonLd"
import { absoluteUrl, getSiteUrl } from "@/lib/seo"

export default function ArticleJsonLd({
  title,
  description,
  path,
  dateModified,
}: {
  title: string
  description: string
  path: string
  dateModified: string
}) {
  const base = getSiteUrl()
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    dateModified,
    author: { "@type": "Organization", name: "Querify", url: base },
    publisher: { "@type": "Organization", name: "Querify", url: base },
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(path) },
  }
  return <JsonLd data={data} />
}
