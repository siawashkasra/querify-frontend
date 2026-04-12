"use client"

import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, Database } from "lucide-react"
import { useAppStore } from "@/store/appStore"
import { connections } from "@/lib/api"
import Badge from "@/components/ui/Badge"
import type { Connection } from "@/types"

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/chat/new": "New Chat",
  "/history": "History",
  "/settings": "Settings",
}

const getTitle = (pathname: string) => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith("/chat/")) return "Chat"
  if (pathname.startsWith("/settings/")) return "Settings"
  return "Querify"
}

export const Header = () => {
  const pathname = usePathname()
  const { activeConnectionId, setActiveConnection } = useAppStore()

  const { data: allConnections } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connections.list() as Promise<Connection[]>,
  })

  const activeConnection = allConnections?.find((c) => c.id === activeConnectionId) ?? allConnections?.[0] ?? null

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border)] bg-surface shrink-0">
      <h1 className="text-sm font-semibold text-[var(--text)]">{getTitle(pathname)}</h1>

      <div className="flex items-center gap-3">
        {activeConnection ? (
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full shrink-0 ${activeConnection.status === "active" ? "bg-success" : activeConnection.status === "error" ? "bg-danger" : "bg-[var(--text-muted)]"}`} />
            <span className="text-xs text-[var(--text-dim)]">{activeConnection.name}</span>
            <Badge variant={activeConnection.status === "active" ? "active" : activeConnection.status === "error" ? "degraded" : "inactive"}>
              {activeConnection.db_type}
            </Badge>
            {allConnections && allConnections.length > 1 && (
              <div className="relative group">
                <button className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-dim)] transition-colors">
                  <ChevronDown size={14} />
                </button>
                <div className="absolute right-0 top-full mt-1 w-52 bg-surface-2 border border-[var(--border)] rounded-lg shadow-lg z-50 hidden group-focus-within:block">
                  {allConnections.map((conn) => (
                    <button
                      key={conn.id}
                      onClick={() => setActiveConnection(conn.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-[var(--text-dim)] hover:bg-surface-3 first:rounded-t-lg last:rounded-b-lg transition-colors"
                    >
                      <Database size={12} className="shrink-0" />
                      <span className="truncate">{conn.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">No database connected</span>
        )}
      </div>
    </header>
  )
}

export default Header
