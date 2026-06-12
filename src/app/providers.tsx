"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
import queryClient from "@/lib/queryClient"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "var(--surface)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-ctrl)",
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            boxShadow: "var(--shadow-float)",
          },
          success: {
            duration: 4000,
            iconTheme: { primary: "var(--verify)", secondary: "var(--surface)" },
          },
          error: {
            duration: 6000,
            iconTheme: { primary: "var(--alert)", secondary: "var(--surface)" },
          },
        }}
      />
    </QueryClientProvider>
  )
}
