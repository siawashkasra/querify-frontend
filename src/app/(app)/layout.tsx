import Sidebar from "@/components/app/Sidebar"
import Header from "@/components/app/Header"
import NetworkBanner from "@/components/app/NetworkBanner"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <NetworkBanner />
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-surface">
        <Header />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
