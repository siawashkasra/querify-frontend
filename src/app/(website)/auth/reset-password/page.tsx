import { Suspense } from "react"
import type { Metadata } from "next"
import ResetPasswordContent from "./ResetPasswordContent"

export const metadata: Metadata = {
  title: "Reset your password — Querify",
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <div className="px-4 py-12 md:py-20">
      <Suspense fallback={<div className="mx-auto h-64 max-w-md animate-pulse rounded-xl bg-slate-100" aria-hidden />}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  )
}
