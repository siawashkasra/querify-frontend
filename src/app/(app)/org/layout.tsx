"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { usePermissions } from "@/lib/permissions"
import { usePlan } from "@/hooks/usePlan"
import { tenant as tenantApi } from "@/lib/api"
import type { TenantInfo } from "@/lib/api"
import { cn } from "@/lib/cn"

// ── Tab definitions ────────────────────────────────────────────────────────────

interface OrgTab {
  label: string
  href: string
  permission: string
  planGated?: boolean
}

const TABS: OrgTab[] = [
  { label: "Connections", href: "/org/connections", permission: "connections:list" },
  { label: "Team", href: "/org/team", permission: "members:list" },
  { label: "Usage", href: "/org/usage", permission: "billing:view" },
  { label: "Billing", href: "/org/billing", permission: "billing:view" },
  { label: "Settings", href: "/org/settings", permission: "settings:view" },
  { label: "Audit Log", href: "/org/audit", permission: "audit_log:view" },
]

// ── Layout ─────────────────────────────────────────────────────────────────────

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { can, isAdmin } = usePermissions()

  const { data: org } = useQuery<TenantInfo>({
    queryKey: ["tenant"],
    queryFn: () => tenantApi.get() as Promise<TenantInfo>,
    staleTime: 5 * 60_000,
  })

  // Redirect non-admins away from admin-only paths
  useEffect(() => {
    if (!can("settings:view") && pathname.includes("/org/settings")) {
      router.replace("/org/connections")
    }
  }, [can, pathname, router])

  const visibleTabs = TABS.filter((t) => can(t.permission))

  function isActive(href: string) {
    return pathname.startsWith(href)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
            Organisation
          </p>
          <h1 className="text-xl font-bold text-[var(--text)]">
            {org?.name ?? "…"}
          </h1>
        </div>

        {/* Tab nav */}
        <div className="flex gap-0.5 border-b border-[var(--border)] -mb-px overflow-x-auto scrollbar-none">
          {visibleTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                isActive(tab.href)
                  ? "border-brand text-brand"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:border-[var(--border)]"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  )
}
