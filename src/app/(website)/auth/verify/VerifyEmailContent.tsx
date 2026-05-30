"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { auth } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import Spinner from "@/components/website/auth/Spinner"
import type { TokenPair } from "@/lib/api"

type State =
  | { kind: "verifying" }
  | { kind: "success" }
  | { kind: "error"; message: string }

export default function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { establishSession } = useAuth()
  const [state, setState] = useState<State>({ kind: "verifying" })
  const [resendEmail, setResendEmail] = useState("")
  const [resendSent, setResendSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const token = searchParams.get("token")
    if (!token) {
      setState({ kind: "error", message: "No verification token found in the link." })
      return
    }

    auth.verifyEmail(token)
      .then(async (result) => {
        const tokens = result as TokenPair
        await establishSession(tokens)
        setState({ kind: "success" })
        setTimeout(() => router.push("/dashboard"), 2000)
      })
      .catch(() => {
        setState({ kind: "error", message: "This link is invalid or has expired." })
      })
  }, [searchParams, establishSession, router])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = window.setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearInterval(t)
  }, [resendCooldown])

  async function handleResend() {
    if (!resendEmail || resendCooldown > 0) return
    try {
      await auth.resendVerification(resendEmail)
    } catch {
      // always show success
    }
    setResendSent(true)
    setResendCooldown(60)
  }

  if (state.kind === "verifying") {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Spinner className="mx-auto h-8 w-8 text-web-brand" />
        <p className="mt-4 text-slate-700 font-medium" role="status">Verifying your email…</p>
      </div>
    )
  }

  if (state.kind === "success") {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900" role="status">Email verified!</h1>
        <p className="mt-2 text-slate-500 text-sm">Taking you to the dashboard…</p>
      </div>
    )
  }

  // Error state
  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-slate-900">Link expired</h1>
      <p className="mt-2 text-sm text-slate-600">{state.message}</p>
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="resend-email" className="text-left text-sm font-medium text-slate-700">
            Your email
          </label>
          <input
            id="resend-email"
            type="email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-web-brand focus:ring-2 focus:ring-web-brand/40"
          />
        </div>
        <button
          type="button"
          onClick={handleResend}
          disabled={!resendEmail || resendCooldown > 0}
          className="w-full rounded-lg bg-web-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-web-brand-dark disabled:opacity-50"
        >
          {resendSent
            ? resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend verification email"
            : "Resend verification email"}
        </button>
        <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          Back to log in
        </Link>
      </div>
    </div>
  )
}
