"use client"

import { useLayoutEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { track } from "@/lib/analytics"
import { auth } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useAuthStore } from "@/store/authStore"
import TextField from "./TextField"
import PasswordField from "./PasswordField"
import Spinner from "./Spinner"
import { isValidEmail, isValidPassword, nonEmpty } from "./authValidation"

type ServerError =
  | { kind: "invalid_credentials" }
  | { kind: "locked" }
  | { kind: "unverified"; email: string }
  | { kind: "generic"; message: string }
  | null

export default function LoginForm() {
  const router = useRouter()
  const { establishSession } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitCount, setSubmitCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<ServerError>(null)
  const [resendSent, setResendSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const emailError = useMemo(() => {
    if (email.length > 0 && !isValidEmail(email)) return "Enter a valid email address"
    if (submitAttempted && !nonEmpty(email)) return "Enter your email"
    return ""
  }, [email, submitAttempted])

  const passwordError = useMemo(() => {
    if (password.length > 0 && !isValidPassword(password)) return "Use at least 8 characters"
    if (submitAttempted && !nonEmpty(password)) return "Enter your password"
    return ""
  }, [password, submitAttempted])

  useLayoutEffect(() => {
    if (submitCount === 0) return
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>("form [aria-invalid='true']")
      el?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [submitCount])

  // Resend cooldown countdown
  useLayoutEffect(() => {
    if (resendCooldown <= 0) return
    const t = window.setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearInterval(t)
  }, [resendCooldown])

  async function handleResend() {
    if (resendCooldown > 0) return
    try {
      await auth.resendVerification(email)
      setResendSent(true)
      setResendCooldown(60)
    } catch {
      // silently ignore — never reveal if email exists
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitAttempted(true)
    setSubmitCount((c) => c + 1)
    setServerError(null)

    if (!isValidEmail(email) || !isValidPassword(password)) return

    setLoading(true)
    track("login_attempted", { source: "website" })

    try {
      const result = await auth.login({ email, password })
      // result is TokenPair for single-tenant; ignore TenantSelectionResponse edge case
      const tokens = result as { access_token: string; refresh_token: string; expires_in: number }
      await establishSession(tokens)
      const { isSuperAdmin } = useAuthStore.getState()
      router.push(isSuperAdmin ? "/admin" : "/dashboard")
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      const msg = (e.message || "").toLowerCase()

      if (e.status === 401) {
        setServerError({ kind: "invalid_credentials" })
      } else if (e.status === 403 && msg.includes("locked")) {
        setServerError({ kind: "locked" })
      } else if (e.status === 403 && (msg.includes("verif") || msg.includes("verified"))) {
        setServerError({ kind: "unverified", email })
      } else {
        setServerError({ kind: "generic", message: e.message || "Something went wrong." })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Welcome back</h1>
      </div>

      {serverError?.kind === "invalid_credentials" && (
        <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Invalid email or password.
        </div>
      )}
      {serverError?.kind === "locked" && (
        <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Account temporarily locked. Try again in 15 minutes.
        </div>
      )}
      {serverError?.kind === "unverified" && (
        <div role="alert" className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>Check your email for a verification link.</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="mt-2 font-semibold text-web-brand underline-offset-4 hover:underline disabled:opacity-50"
          >
            {resendSent
              ? resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend email"
              : "Resend verification email"}
          </button>
        </div>
      )}
      {serverError?.kind === "generic" && (
        <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={emailError}
          required
        />
        <div className="flex flex-col gap-1">
          <PasswordField
            name="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={passwordError}
            required
          />
          <Link
            href="/forgot-password"
            className="self-end text-sm font-medium text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm"
          >
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-web-brand py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-web-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {loading && <Spinner />}
          {loading ? "Signing in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        No account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm"
        >
          Sign up free
        </Link>
      </p>
    </div>
  )
}
