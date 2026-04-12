import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AppState {
  activeConnectionId: string | null
  activeSessionId: string | null
  sidebarCollapsed: boolean
  setActiveConnection: (id: string | null) => void
  setActiveSession: (id: string | null) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeConnectionId: null,
      activeSessionId: null,
      sidebarCollapsed: false,
      setActiveConnection: (id) => set({ activeConnectionId: id }),
      setActiveSession: (id) => set({ activeSessionId: id }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: "querify-app",
      partialize: (s) => ({ activeConnectionId: s.activeConnectionId }),
    }
  )
)
