"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, MessageSquarePlus, Clock, Settings,
  Database, ChevronLeft, ChevronRight, Sparkles, FileText,
  ChevronDown, Check, Loader2, Building2, LogOut,
} from "lucide-react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { useAppStore } from "@/store/appStore"
import { useAuthStore } from "@/store/authStore"
import { useQuery } from "@tanstack/react-query"
import { connections, insights as insightsApi, me as meApi } from "@/lib/api"
import { usePermissions } from "@/lib/permissions"
import { useAuth } from "@/hooks/useAuth"
import type { Connection, Insight } from "@/types"
import type { UserProfile, UserTenant } from "@/lib/api"
import { NotificationPanel } from "@/components/app/NotificationPanel"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

// ── Tenant Selector ───────────────────────────────────────────────────────────

function TenantSelector({ collapsed }: { collapsed: boolean }) {
  const router = useRouter()
  const { establishSession } = useAuth()
  const tenantId = useAuthStore((s) => s.tenantId)
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const { data: userTenants } = useQuery<UserTenant[]>({
    queryKey: ["me-tenants"],
    queryFn: () => meApi.tenants() as Promise<UserTenant[]>,
    staleTime: 5 * 60_000,
  })

  const currentTenant = userTenants?.find((t) => t.tenant_id === tenantId)
  const hasMultiple = (userTenants?.length ?? 0) > 1

  async function handleSwitch(targetId: string) {
    if (targetId === tenantId || switching) return
    setSwitching(targetId)
    try {
      const tokens = await meApi.switchTenant(targetId)
      await establishSession(tokens as { access_token: string; refresh_token: string; expires_in: number })
      window.location.href = "/dashboard"
    } catch {
      setSwitching(null)
    }
  }

  if (collapsed) {
    return (
      <div className="flex items-center justify-center px-0 py-2">
        <span title={currentTenant?.tenant_name ?? "Tenant"}>
          <Building2 size={16} className="text-[var(--text-muted)]" aria-hidden />
        </span>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative px-3 py-2">
      <button
        onClick={() => hasMultiple && setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 w-full text-left rounded",
          hasMultiple && "hover:bg-surface-2 cursor-pointer",
          !hasMultiple && "cursor-default"
        )}
      >
        <Building2 size={13} className="text-[var(--text-muted)] shrink-0" />
        <span className="flex-1 text-xs font-medium text-[var(--text-dim)] truncate">
          {currentTenant?.tenant_name ?? "Loading…"}
        </span>
        {hasMultiple && <ChevronDown size={12} className={cn("text-[var(--text-muted)] shrink-0 transition-transform", open && "rotate-180")} />}
      </button>

      {open && hasMultiple && (
        <div className="absolute left-2 right-2 top-full mt-1 z-50 rounded-lg border border-[var(--border)] bg-surface shadow-lg overflow-hidden">
          {userTenants!.map((t) => {
            const isActive = t.tenant_id === tenantId
            const isLoading = switching === t.tenant_id
            return (
              <button
                key={t.tenant_id}
                onClick={() => handleSwitch(t.tenant_id)}
                disabled={isActive || !!switching}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-left text-xs transition-colors",
                  isActive ? "bg-surface-2 text-brand font-medium" : "text-[var(--text-dim)] hover:bg-surface-2",
                  "disabled:cursor-default"
                )}
              >
                {isLoading
                  ? <Loader2 size={11} className="animate-spin shrink-0" />
                  : isActive
                    ? <Check size={11} className="shrink-0 text-brand" />
                    : <span className="w-[11px] shrink-0" />
                }
                <span className="flex-1 truncate">{t.tenant_name}</span>
                <span className="text-[10px] text-[var(--text-muted)] capitalize shrink-0">
                  {t.role.replace("_", " ")}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Nav items ─────────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  permission?: string   // if set, hidden when user lacks this permission
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "New Chat", icon: MessageSquarePlus, href: "/chat/new" },
  { label: "History", icon: Clock, href: "/history" },
  { label: "Insights", icon: Sparkles, href: "/insights" },
  { label: "Activity", icon: FileText, href: "/audit-log", permission: "audit_log:view" },
  { label: "Settings", icon: Settings, href: "/settings", permission: "settings:view" },
]

// ── Sidebar ───────────────────────────────────────────────────────────────────

function UserFooter({ collapsed }: { collapsed: boolean }) {
  const { logout } = useAuth()
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["me-profile"],
    queryFn: () => meApi.profile() as Promise<UserProfile>,
    staleTime: 5 * 60_000,
  })

  const initials = (profile?.name ?? profile?.email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  if (collapsed) {
    return (
      <button
        onClick={logout}
        title="Sign out"
        className="flex items-center justify-center w-full py-2 text-[var(--text-muted)] hover:text-danger transition-colors"
      >
        <LogOut size={15} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded hover:bg-surface-2 group transition-colors">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-[11px] font-bold select-none">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--text)] truncate leading-tight">
          {profile?.name ?? "Account"}
        </p>
        <p className="text-[10px] text-[var(--text-muted)] truncate leading-tight">
          {profile?.email ?? ""}
        </p>
      </div>
      <button
        onClick={logout}
        title="Sign out"
        className="shrink-0 p-1 rounded text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-danger transition-all"
        aria-label="Sign out"
      >
        <LogOut size={14} />
      </button>
    </div>
  )
}

export const Sidebar = () => {
  const pathname = usePathname()
  const { activeConnectionId, sidebarCollapsed, toggleSidebar } = useAppStore()
  const { can } = usePermissions()

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
      {/* Header / brand */}
      <div className={cn("flex items-center h-14 border-b border-[var(--border)] px-4", sidebarCollapsed && "justify-center px-0")}>
        {!sidebarCollapsed && <span className="font-mono font-bold text-brand tracking-widest text-sm">QUERIFY</span>}
        {sidebarCollapsed && <span className="font-mono font-bold text-brand text-sm">Q</span>}
      </div>

      {/* Tenant selector */}
      {!sidebarCollapsed && (
        <div className="border-b border-[var(--border)]">
          <TenantSelector collapsed={false} />
        </div>
      )}
      {sidebarCollapsed && (
        <div className="border-b border-[var(--border)]">
          <TenantSelector collapsed={true} />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {NAV_ITEMS.filter(({ permission }) => !permission || can(permission)).map(({ label, icon: Icon, href }) => {
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

      {/* Footer */}
      <div className={cn("px-2 py-3 border-t border-[var(--border)] flex flex-col gap-1", sidebarCollapsed && "px-0 items-center")}>
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
          !sidebarCollapsed && can("connections:create") && (
            <Link
              href="/settings/connections/new"
              className="flex items-center gap-2 px-3 py-2 rounded text-xs text-[var(--text-muted)] hover:text-brand hover:bg-[var(--brand-light)] transition-colors"
            >
              <Database size={14} className="shrink-0" />
              Connect a database
            </Link>
          )
        )}
        <UserFooter collapsed={sidebarCollapsed} />
        <div className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "justify-between")}>
          {!sidebarCollapsed && <NotificationPanel />}
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-surface-2 transition-colors"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
