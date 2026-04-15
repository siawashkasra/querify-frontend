import JsonLd from "./JsonLd"
import { absoluteUrl, getSiteUrl } from "@/lib/seo"

export default function PricingJsonLd() {
  const base = getSiteUrl()
  const offers = [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD", url: absoluteUrl("/signup"), description: "20 queries per month, one connection" },
    { "@type": "Offer", name: "Starter", price: "29", priceCurrency: "USD", url: absoluteUrl("/signup?plan=starter"), priceValidUntil: "2027-12-31", description: "Monthly billing" },
    { "@type": "Offer", name: "Pro", price: "79", priceCurrency: "USD", url: absoluteUrl("/signup?plan=pro"), priceValidUntil: "2027-12-31", description: "Monthly billing" },
    { "@type": "Offer", name: "Team", price: "199", priceCurrency: "USD", url: absoluteUrl("/contact"), priceValidUntil: "2027-12-31", description: "Contact sales for Team plan" },
  ]
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Querify",
    description: "AI analytics for your database: ask questions in plain English, get answers and charts.",
    brand: { "@type": "Brand", name: "Querify" },
    url: absoluteUrl("/pricing"),
    offers,
  }
  return <JsonLd data={data} />
}
