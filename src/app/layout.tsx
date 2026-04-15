import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Providers from "./providers"
import { mergeRootMetadata } from "@/lib/seo"

const inter = Inter({ subsets: ["latin"], display: "swap" })

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
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <link rel="preconnect" href={posthogOrigin} crossOrigin="anonymous" />
      </head>
      <body className={`min-h-full flex flex-col antialiased ${inter.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
