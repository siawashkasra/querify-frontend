"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, Users, Search, Activity, AlertCircle, BarChart2,
  Server, Briefcase, Wifi, DollarSign, FileText, Bug, ScrollText,
  LogOut, ChevronRight, RotateCcw, Mail,
} from "lucide-react"
import { cn } from "@/lib/cn"
import { useAuthStore } from "@/store/authStore"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Tenants",
    items: [
      { label: "All Tenants", href: "/admin/tenants", icon: Users },
      { label: "Tenant Search", href: "/admin/tenants/search", icon: Search },
    ],
  },
  {
    title: "Monitoring",
    items: [
      { label: "Query Feed", href: "/admin/queries", icon: Activity },
      { label: "Failed Queries", href: "/admin/queries/failed", icon: AlertCircle },
      { label: "Accuracy Report", href: "/admin/queries/accuracy", icon: BarChart2 },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Infrastructure", href: "/admin/system", icon: Server },
      { label: "Background Jobs", href: "/admin/system/jobs", icon: Briefcase },
      { label: "Connection Health", href: "/admin/system/connections", icon: Wifi },
    ],
  },
  {
    title: "Revenue",
    items: [
      { label: "Revenue Overview", href: "/admin/revenue", icon: DollarSign },
      { label: "Tenant Billing", href: "/admin/revenue/billing", icon: FileText },
      { label: "LLM Costs", href: "/admin/revenue/costs", icon: DollarSign },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "User Lookup", href: "/admin/support/users", icon: Search },
      { label: "Connection Debugger", href: "/admin/support/connections", icon: Bug },
      { label: "Query Replay", href: "/admin/support/query-replay", icon: RotateCcw },
      { label: "Email Sender", href: "/admin/support/email", icon: Mail },
      { label: "Audit Log", href: "/admin/audit", icon: ScrollText },
    ],
  },
]

export default function SuperAdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  function handleLogout() {
    logout()
    fetch("/api/auth/session", { method: "DELETE" }).catch(() => {})
    router.push("/login")
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin"
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="flex flex-col h-full w-60 flex-shrink-0 overflow-y-auto"
      style={{ backgroundColor: "#111827" }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <span className="text-xs font-bold tracking-[0.2em] text-white/60 uppercase select-none">
          Querify
        </span>
        <span className="ml-1.5 text-xs font-bold tracking-widest text-white/30 uppercase">
          Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-5 overflow-y-auto">
        {NAV.map((section) => (
          <div key={section.title}>
            <p className="px-2 mb-1 text-[10px] font-semibold tracking-widest uppercase text-white/30">
              {section.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                        active
                          ? "bg-white/10 text-white font-medium"
                          : "text-white/50 hover:text-white/80 hover:bg-white/5"
                      )}
                    >
                      <item.icon size={14} className="flex-shrink-0" />
                      {item.label}
                      {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom: user + logout */}
      <div className="px-3 py-4 border-t border-white/10 flex flex-col gap-1">
        <p className="px-2 text-xs text-white/40 truncate">{user?.email ?? "—"}</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
        >
          <LogOut size={14} />
          Log out
        </button>
      </div>
    </aside>
  )
}
