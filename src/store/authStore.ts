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
  isSuperAdmin: boolean
  isAuthenticated: boolean
  // Actions
  setTokens: (access: string, refresh: string) => void
  setUser: (user: AuthUser) => void
  setTenantContext: (tenantId: string, role: string, isSuperAdmin: boolean) => void
  logout: () => void
}

const EMPTY: Pick<AuthState, "accessToken" | "refreshToken" | "user" | "tenantId" | "role" | "isSuperAdmin" | "isAuthenticated"> = {
  accessToken: null,
  refreshToken: null,
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

      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      setTenantContext: (tenantId, role, isSuperAdmin) => set({ tenantId, role, isSuperAdmin }),

      logout: () => set({ ...EMPTY }),
    }),
    {
      name: "querify-auth",
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        tenantId: s.tenantId,
        role: s.role,
        isSuperAdmin: s.isSuperAdmin,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)
