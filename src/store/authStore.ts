import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AuthUser {
  userId: string
  email: string
  name: string | null
}

interface AuthState {
  // The access token is kept in MEMORY only (never persisted) — an XSS can't read
  // it from localStorage, and it's short-lived. The refresh token lives in an
  // httpOnly cookie set by the backend and is never visible to JS.
  accessToken: string | null
  user: AuthUser | null
  tenantId: string | null
  role: string | null
  isSuperAdmin: boolean
  isAuthenticated: boolean
  // Actions
  setTokens: (access: string) => void
  setUser: (user: AuthUser) => void
  setTenantContext: (tenantId: string, role: string, isSuperAdmin: boolean) => void
  logout: () => void
}

const EMPTY: Pick<AuthState, "accessToken" | "user" | "tenantId" | "role" | "isSuperAdmin" | "isAuthenticated"> = {
  accessToken: null,
  user: null,
  tenantId: null,
  role: null,
  isSuperAdmin: false,
  isAuthenticated: false,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...EMPTY,

      setTokens: (access) => set({ accessToken: access, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      setTenantContext: (tenantId, role, isSuperAdmin) => set({ tenantId, role, isSuperAdmin }),

      logout: () => set({ ...EMPTY }),
    }),
    {
      name: "querify-auth",
      // Persist only NON-SENSITIVE UI context — never a token. On reload the
      // access token is gone (memory), so the first API call refreshes via the
      // httpOnly cookie; isAuthenticated is an optimistic flag the cookie backs.
      partialize: (s) => ({
        user: s.user,
        tenantId: s.tenantId,
        role: s.role,
        isSuperAdmin: s.isSuperAdmin,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)
