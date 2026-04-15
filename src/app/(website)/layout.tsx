import { Inter } from "next/font/google"
import CookieBanner from "@/components/website/CookieBanner"
import WebsiteNav from "@/components/website/WebsiteNav"
import WebsiteFooter from "@/components/website/WebsiteFooter"

const inter = Inter({ subsets: ["latin"] })

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.className} min-h-screen flex flex-col bg-white text-slate-900 antialiased`}>
      <WebsiteNav />
      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <WebsiteFooter />
      <CookieBanner />
    </div>
  )
}
