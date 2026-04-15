import Link from "next/link"
import { LandingPrimaryCta } from "@/components/website/landing/LandingPrimaryCta"

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-3 text-slate-600">Sign up to connect your database and start asking questions.</p>
      <div className="mt-8 flex flex-col gap-3">
        <LandingPrimaryCta href="/settings/connections/new" location="signup_page" ctaText="Continue to connect database">Continue to connect your database</LandingPrimaryCta>
        <Link href="/login" className="text-sm font-medium text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">Already have an account? Log in</Link>
      </div>
    </div>
  )
}
