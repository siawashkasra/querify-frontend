import type { Metadata } from "next"
import { Suspense } from "react"
import SignupForm from "@/components/website/auth/SignupForm"
import { createMetadata } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "Sign up — Querify",
  description: "Create a Querify account, connect your database read-only, and ask your first question in minutes.",
  path: "/signup",
})

export default function SignupPage() {
  return (
    <div className="px-4 py-12 md:py-20">
      <Suspense fallback={<div className="mx-auto h-96 max-w-md animate-pulse rounded-xl bg-slate-100" aria-hidden />}>
        <SignupForm />
      </Suspense>
    </div>
  )
}
