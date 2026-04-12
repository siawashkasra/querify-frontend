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
          style: {
            background: "var(--surface-2)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-sans)",
          },
          success: { iconTheme: { primary: "#10B981", secondary: "#fff" } },
          error: { iconTheme: { primary: "#EF4444", secondary: "#fff" } },
        }}
      />
    </QueryClientProvider>
  )
}
