"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import type { TokenPair } from "@/lib/api"
import { auth } from "@/lib/api"

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch {
    return {}
  }
}

export function useAuth() {
  const router = useRouter()
  const { setTokens, setUser, setTenantContext, logout: clearStore } = useAuthStore()

  const establishSession = useCallback(
    async (tokens: TokenPair) => {
      setTokens(tokens.access_token, tokens.refresh_token)
      const payload = decodeJwtPayload(tokens.access_token)
      if (payload.tenant_id && payload.role !== undefined) {
        setTenantContext(payload.tenant_id as string, payload.role as string)
      }
      // Set httpOnly session cookie via Route Handler so proxy can guard (app) routes
      await fetch("/api/auth/session", { method: "POST" })
    },
    [setTokens, setTenantContext]
  )

  const logout = useCallback(async () => {
    const refreshToken = useAuthStore.getState().refreshToken
    try {
      if (refreshToken) await auth.logout(refreshToken)
    } catch {
      // ignore backend errors on logout
    }
    clearStore()
    await fetch("/api/auth/session", { method: "DELETE" })
    router.push("/login")
  }, [clearStore, router])

  return { establishSession, setUser, setTenantContext, logout }
}
