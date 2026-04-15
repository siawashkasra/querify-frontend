import JsonLd from "./JsonLd"
import { absoluteUrl, getSiteUrl } from "@/lib/seo"

export default function BlogPostingJsonLd({
  title,
  description,
  path,
  datePublished,
  dateModified,
  author,
}: {
  title: string
  description: string
  path: string
  datePublished: string
  dateModified: string
  author: string
}) {
  const base = getSiteUrl()
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    datePublished,
    dateModified,
    author: { "@type": "Person", name: author },
    publisher: { "@type": "Organization", name: "Querify", url: base },
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(path) },
  }
  return <JsonLd data={data} />
}
