"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, MessageSquarePlus, Clock, Settings, Database, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { useAppStore } from "@/store/appStore"
import { useQuery } from "@tanstack/react-query"
import { connections, insights as insightsApi } from "@/lib/api"
import type { Connection, Insight } from "@/types"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "New Chat", icon: MessageSquarePlus, href: "/chat/new" },
  { label: "History", icon: Clock, href: "/history" },
  { label: "Insights", icon: Sparkles, href: "/insights" },
  { label: "Settings", icon: Settings, href: "/settings" },
]

export const Sidebar = () => {
  const pathname = usePathname()
  const { activeConnectionId, sidebarCollapsed, toggleSidebar } = useAppStore()

  const { data: allConnections } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connections.list() as Promise<Connection[]>,
  })

  const { data: unreadInsights } = useQuery<Insight[]>({
    queryKey: ["insights", activeConnectionId, "unread"],
    queryFn: () => insightsApi.list(activeConnectionId ?? undefined, true) as Promise<Insight[]>,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    enabled: !!activeConnectionId,
  })

  const unreadCount = unreadInsights?.length ?? 0
  const activeConnection = allConnections?.find((c) => c.id === activeConnectionId) ?? allConnections?.[0] ?? null

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[var(--bg)] border-r border-[var(--border)] transition-all duration-200 shrink-0",
        sidebarCollapsed ? "w-[56px]" : "w-[240px]"
      )}
    >
      <div className={cn("flex items-center h-14 border-b border-[var(--border)] px-4", sidebarCollapsed && "justify-center px-0")}>
        {!sidebarCollapsed && (
          <span className="font-mono font-bold text-brand tracking-widest text-sm">QUERIFY</span>
        )}
        {sidebarCollapsed && <span className="font-mono font-bold text-brand text-sm">Q</span>}
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)
          const showBadge = label === "Insights" && unreadCount > 0
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors",
                sidebarCollapsed && "justify-center px-0 py-2.5",
                isActive
                  ? "bg-brand text-white"
                  : "text-[var(--text-dim)] hover:text-brand hover:bg-[var(--brand-light)]"
              )}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon size={16} className="shrink-0" />
              {!sidebarCollapsed && <span className="flex-1">{label}</span>}
              {showBadge && !sidebarCollapsed && (
                <span className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              {showBadge && sidebarCollapsed && (
                <span className="absolute left-6 top-1 flex items-center justify-center h-3.5 w-3.5 rounded-full bg-danger text-white text-[9px] font-bold" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className={cn("px-2 py-3 border-t border-[var(--border)]", sidebarCollapsed && "px-0 flex justify-center")}>
        {activeConnection ? (
          <div className={cn("flex items-center gap-2 px-3 py-2 rounded bg-surface-2", sidebarCollapsed && "px-2 justify-center")}>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            {!sidebarCollapsed && (
              <span className="text-xs text-[var(--text-dim)] truncate">{activeConnection.name}</span>
            )}
          </div>
        ) : (
          !sidebarCollapsed && (
            <Link href="/settings/connections/new" className="flex items-center gap-2 px-3 py-2 rounded text-xs text-[var(--text-muted)] hover:text-brand hover:bg-[var(--brand-light)] transition-colors">
              <Database size={14} className="shrink-0" />
              Connect a database
            </Link>
          )
        )}
        <button
          onClick={toggleSidebar}
          className="mt-2 flex w-full items-center justify-center py-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-surface-2 transition-colors"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
