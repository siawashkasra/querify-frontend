import type { Metadata } from "next"
import Sidebar from "@/components/app/Sidebar"
import NetworkBanner from "@/components/app/NetworkBanner"
import PlanLimitBanner from "@/components/billing/PlanLimitBanner"

export const metadata: Metadata = {
  title: { absolute: "Querify — App" },
  description: "Querify product dashboard and chat.",
  robots: { index: false, follow: false },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <NetworkBanner />
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <PlanLimitBanner />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
