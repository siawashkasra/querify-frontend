import JsonLd from "./JsonLd"
import { getSiteUrl } from "@/lib/seo"

export default function HomeJsonLd() {
  const base = getSiteUrl()
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Querify",
    url: base,
    description:
      "Connect your database and ask business questions in plain English. No SQL, no dashboards. Get answers in seconds.",
    publisher: { "@type": "Organization", name: "Querify", url: base },
  }
  const app = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Querify",
    url: base,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Modern evergreen browser.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free tier available" },
    description:
      "Ask your database anything in plain English. Read-only database access, AI-powered answers and charts.",
  }
  return (
    <>
      <JsonLd data={website} />
      <JsonLd data={app} />
    </>
  )
}
