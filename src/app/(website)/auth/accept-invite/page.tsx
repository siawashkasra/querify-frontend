import { Suspense } from "react"
import type { Metadata } from "next"
import AcceptInviteContent from "./AcceptInviteContent"

export const metadata: Metadata = {
  title: "Accept invitation — Querify",
  robots: { index: false, follow: false },
}

export default function AcceptInvitePage() {
  return (
    <div className="px-4 py-12 md:py-20">
      <Suspense fallback={<div className="mx-auto h-64 max-w-md animate-pulse rounded-xl bg-slate-100" aria-hidden />}>
        <AcceptInviteContent />
      </Suspense>
    </div>
  )
}
