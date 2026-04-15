import { Suspense } from "react"
import SignupForm from "@/components/website/auth/SignupForm"

export default function SignupPage() {
  return (
    <div className="px-4 py-12 md:py-20">
      <Suspense fallback={<div className="mx-auto h-96 max-w-md animate-pulse rounded-xl bg-slate-100" aria-hidden />}>
        <SignupForm />
      </Suspense>
    </div>
  )
}
