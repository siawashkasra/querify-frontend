"use client"

import { usePermissions } from "@/lib/permissions"

interface CanDoProps {
  permission: string
  children: React.ReactNode
  /** Fallback to render when permission is denied. Defaults to null. */
  fallback?: React.ReactNode
}

/**
 * Renders children only when the current user has the given permission.
 * Renders null (or fallback) otherwise — no error state, no "not authorised" message.
 *
 * The absence of the UI element IS the access control.
 */
export function CanDo({ permission, children, fallback = null }: CanDoProps) {
  const { can } = usePermissions()
  return can(permission) ? <>{children}</> : <>{fallback}</>
}

export default CanDo
