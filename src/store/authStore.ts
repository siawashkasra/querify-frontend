import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AuthUser {
  userId: string
  email: string
  name: string | null
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  tenantId: string | null
  role: string | null
  isAuthenticated: boolean
  // Actions
  setTokens: (access: string, refresh: string) => void
  setUser: (user: AuthUser) => void
  setTenantContext: (tenantId: string, role: string) => void
  logout: () => void
}

const EMPTY: Pick<AuthState, "accessToken" | "refreshToken" | "user" | "tenantId" | "role" | "isAuthenticated"> = {
  accessToken: null,
  refreshToken: null,
  user: null,
  tenantId: null,
  role: null,
  isAuthenticated: false,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...EMPTY,

      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      setTenantContext: (tenantId, role) => set({ tenantId, role }),

      logout: () => set({ ...EMPTY }),
    }),
    {
      name: "querify-auth",
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        tenantId: s.tenantId,
        role: s.role,
      }),
    }
  )
)
