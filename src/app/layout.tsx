import type { Metadata } from "next"
import { Schibsted_Grotesk, Instrument_Sans, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"
import Providers from "./providers"
import { mergeRootMetadata } from "@/lib/seo"

// U1 — the type trio. Display (characterful, 600/700 only), body (Instrument
// Sans), data (IBM Plex Mono, tabular). Exposed as CSS variables the Tailwind
// theme + globals.css map onto font-display / font-sans / font-data.
const fontDisplay = Schibsted_Grotesk({ subsets: ["latin"], weight: ["600", "700"], variable: "--f-display", display: "swap" })
const fontSans = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-sans", display: "swap" })
const fontData = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-data", display: "swap" })

export const metadata: Metadata = mergeRootMetadata()

const posthogOrigin = (() => {
  const h = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"
  try {
    return new URL(h.startsWith("http") ? h : `https://${h}`).origin
  } catch {
    return "https://us.i.posthog.com"
  }
})()

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full scroll-smooth ${fontDisplay.variable} ${fontSans.variable} ${fontData.variable}`}>
      <head>
        <link rel="preconnect" href={posthogOrigin} crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
