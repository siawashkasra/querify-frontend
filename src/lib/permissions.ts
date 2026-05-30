import { useAuthStore } from "@/store/authStore"

// ── Permission matrix ─────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  tenant_admin: [
    "connections:create",
    "connections:delete",
    "connections:edit",
    "connections:test",
    "members:invite",
    "members:change_role",
    "members:remove",
    "members:list",
    "settings:view",
    "settings:edit",
    "billing:manage",
    "billing:view",
    "audit_log:view",
    "query:execute",
    "query:history",
    "insights:view",
    "insights:dismiss",
    "tenant:view",
    "tenant:edit",
    "connections:list",
  ],
  end_user: [
    "connections:list",
    "connections:test",
    "query:execute",
    "query:history",
    "insights:view",
    "insights:dismiss",
    "tenant:view",
    "members:list",
  ],
  billing_admin: [
    "billing:view",
    "billing:manage",
    "connections:list",
    "insights:view",
    "tenant:view",
    "members:list",
  ],
}

export function can(role: string | null | undefined, permission: string): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function usePermissions() {
  const role = useAuthStore((s) => s.role)

  return {
    can: (permission: string) => can(role, permission),
    role,
    isAdmin: role === "tenant_admin",
    isBillingAdmin: role === "billing_admin",
    isEndUser: role === "end_user",
  }
}
