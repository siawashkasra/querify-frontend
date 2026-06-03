import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AppState {
  activeConnectionId: string | null
  activeSessionId: string | null
  sidebarCollapsed: boolean
  showRightPanel: boolean
  setActiveConnection: (id: string | null) => void
  setActiveSession: (id: string | null) => void
  toggleSidebar: () => void
  toggleRightPanel: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeConnectionId: null,
      activeSessionId: null,
      sidebarCollapsed: false,
      showRightPanel: true,
      setActiveConnection: (id) => set({ activeConnectionId: id }),
      setActiveSession: (id) => set({ activeSessionId: id }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleRightPanel: () => set((s) => ({ showRightPanel: !s.showRightPanel })),
    }),
    {
      name: "querify-app",
      partialize: (s) => ({ activeConnectionId: s.activeConnectionId, showRightPanel: s.showRightPanel }),
    }
  )
)
