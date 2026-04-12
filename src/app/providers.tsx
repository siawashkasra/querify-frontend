"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
import queryClient from "@/lib/queryClient"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#ffffff",
            color: "var(--text)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          },
          success: {
            duration: 3000,
            iconTheme: { primary: "#10B981", secondary: "#fff" },
          },
          error: {
            duration: 6000,
            iconTheme: { primary: "#EF4444", secondary: "#fff" },
          },
        }}
      />
    </QueryClientProvider>
  )
}
