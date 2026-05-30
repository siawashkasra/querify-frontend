"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { auth } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import PasswordField from "@/components/website/auth/PasswordField"
import PasswordStrength from "@/components/website/auth/PasswordStrength"
import Spinner from "@/components/website/auth/Spinner"
import { isValidPassword, nonEmpty } from "@/components/website/auth/authValidation"
import type { TokenPair } from "@/lib/api"

type State = "form" | "success"

export default function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { establishSession } = useAuth()
  const token = searchParams.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")
  const [pageState, setPageState] = useState<State>("form")

  const passwordError = useMemo(() => {
    if (password.length > 0 && !isValidPassword(password)) return "Use at least 8 characters"
    if (submitAttempted && !nonEmpty(password)) return "Enter a new password"
    return ""
  }, [password, submitAttempted])

  const confirmError = useMemo(() => {
    if (confirm.length > 0 && confirm !== password) return "Passwords do not match"
    if (submitAttempted && !nonEmpty(confirm)) return "Confirm your new password"
    return ""
  }, [confirm, password, submitAttempted])

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-700 font-medium">This reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm font-semibold text-web-brand hover:underline">
          Request a new link
        </Link>
      </div>
    )
  }

  if (pageState === "success") {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900" role="status">Password reset</h1>
        <p className="mt-2 text-sm text-slate-500">Redirecting you to log in…</p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitAttempted(true)
    setServerError("")
    if (!isValidPassword(password) || confirm !== password) return

    setLoading(true)
    try {
      const result = await auth.resetPassword(token, password)
      const tokens = result as TokenPair
      await establishSession(tokens)
      setPageState("success")
      setTimeout(() => router.push("/dashboard"), 2000)
    } catch (err: unknown) {
      const e = err as { status?: number }
      if (e.status === 400 || e.status === 422) {
        setServerError("This reset link is invalid or has expired. Request a new one.")
      } else {
        setServerError("Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Choose a new password
        </h1>
      </div>

      {serverError && (
        <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}{" "}
          {serverError.includes("expired") && (
            <Link href="/forgot-password" className="font-semibold underline underline-offset-2">
              Request new link
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <PasswordField
            name="password"
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            error={passwordError}
            required
          />
          {password.length > 0 && <PasswordStrength password={password} />}
        </div>
        <PasswordField
          name="confirm"
          label="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          error={confirmError}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-web-brand py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-web-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {loading && <Spinner />}
          {loading ? "Resetting…" : "Reset password"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-web-brand hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  )
}
