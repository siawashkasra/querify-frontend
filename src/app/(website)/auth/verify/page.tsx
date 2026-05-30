import { Suspense } from "react"
import type { Metadata } from "next"
import VerifyEmailContent from "./VerifyEmailContent"

export const metadata: Metadata = {
  title: "Verify your email — Querify",
  robots: { index: false, follow: false },
}

export default function VerifyEmailPage() {
  return (
    <div className="px-4 py-12 md:py-20">
      <Suspense fallback={<VerifyEmailSkeleton />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}

function VerifyEmailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-slate-200" />
      <div className="mx-auto h-6 w-48 animate-pulse rounded bg-slate-200" />
      <div className="mx-auto mt-3 h-4 w-64 animate-pulse rounded bg-slate-100" />
    </div>
  )
}
