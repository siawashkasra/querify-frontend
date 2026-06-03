"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import SuperAdminSidebar from "@/components/admin/SuperAdminSidebar"

/**
 * Super admin layout.
 * Guards: must be authenticated with is_super_admin=true in the JWT.
 * No links to /admin exist anywhere in the public site or user app.
 * Dark sidebar (#111827) + white main area.
 */
function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isSuperAdmin } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login?error=Please+log+in+to+continue")
      return
    }
    if (!isSuperAdmin) {
      router.replace("/login?error=Unauthorized+access")
    }
  }, [isAuthenticated, isSuperAdmin, router])

  if (!isAuthenticated || !isSuperAdmin) {
    return (
      <div
        className="flex items-center justify-center h-screen text-sm"
        style={{ backgroundColor: "#111827", color: "#6b7280" }}
      >
        Verifying access…
      </div>
    )
  }

  return <>{children}</>
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SuperAdminGuard>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#111827" }}>
        <SuperAdminSidebar />
        <div className="flex-1 overflow-y-auto bg-[#f9fafb]">
          {children}
        </div>
      </div>
    </SuperAdminGuard>
  )
}
