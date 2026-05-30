"use client"

import { useLayoutEffect, useMemo, useState } from "react"
import Link from "next/link"
import { track } from "@/lib/analytics"
import { auth } from "@/lib/api"
import TextField from "./TextField"
import PasswordField from "./PasswordField"
import PasswordStrength from "./PasswordStrength"
import Spinner from "./Spinner"
import { isValidEmail, isValidPassword, nonEmpty, passwordRequirementsMessage } from "./authValidation"

type Step = "form" | "check_inbox"

export default function SignupForm() {
  const [step, setStep] = useState<Step>("form")
  const [registeredEmail, setRegisteredEmail] = useState("")

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [company, setCompany] = useState("")
  const [agree, setAgree] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitCount, setSubmitCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendSent, setResendSent] = useState(false)

  const nameError = useMemo(() => {
    if (submitAttempted && !nonEmpty(fullName)) return "Enter your full name"
    return ""
  }, [fullName, submitAttempted])

  const emailError = useMemo(() => {
    if (email.length > 0 && !isValidEmail(email)) return "Enter a valid email address"
    if (submitAttempted && !nonEmpty(email)) return "Enter your work email"
    return ""
  }, [email, submitAttempted])

  const passwordError = useMemo(() => {
    if (submitAttempted && !nonEmpty(password)) return "Enter a password"
    if (password.length > 0) return passwordRequirementsMessage(password)
    return ""
  }, [password, submitAttempted])

  const companyError = useMemo(() => {
    if (submitAttempted && !nonEmpty(company)) return "Enter your company name"
    return ""
  }, [company, submitAttempted])

  const agreeError = useMemo(() => {
    if (!submitAttempted) return ""
    if (!agree) return "You must agree to the Terms of Service and Privacy Policy"
    return ""
  }, [agree, submitAttempted])

  useLayoutEffect(() => {
    if (step !== "form" || submitCount === 0) return
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>("form [aria-invalid='true']")
      el?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [submitCount, step])

  useLayoutEffect(() => {
    if (resendCooldown <= 0) return
    const t = window.setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearInterval(t)
  }, [resendCooldown])

  async function handleResend() {
    if (resendCooldown > 0) return
    try {
      await auth.resendVerification(registeredEmail)
      setResendSent(true)
      setResendCooldown(60)
    } catch {
      // always show success to avoid email enumeration
      setResendSent(true)
      setResendCooldown(60)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitAttempted(true)
    setSubmitCount((c) => c + 1)
    setServerError("")

    const ok =
      nonEmpty(fullName) &&
      isValidEmail(email) &&
      isValidPassword(password) &&
      nonEmpty(company) &&
      agree
    if (!ok) return

    setLoading(true)
    track("signup_attempted", { source: "website" })

    try {
      await auth.register({
        email,
        password,
        name: fullName,
        company_name: company,
      })
      setRegisteredEmail(email)
      setStep("check_inbox")
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string; error_type?: string }
      if (e.status === 409) {
        setServerError("An account with this email already exists. Try logging in.")
      } else if (e.status === 429) {
        setServerError("Too many sign-up attempts. Please wait a few minutes and try again.")
      } else if (e.status === 422 && e.message) {
        setServerError(e.message)
      } else {
        setServerError("Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (step === "check_inbox") {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-web-brand/10">
          <svg className="h-6 w-6 text-web-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900" role="status">Check your inbox</h2>
        <p className="mt-2 text-slate-600">
          We sent a verification link to{" "}
          <span className="font-semibold text-slate-900">{registeredEmail}</span>.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Click the link in the email to activate your account.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="text-sm font-semibold text-web-brand underline-offset-4 hover:underline disabled:opacity-50"
          >
            {resendSent
              ? resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend email"
              : "Resend email"}
          </button>
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-700">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Start asking your data questions
        </h1>
        <p className="mt-2 text-slate-600">Connect your database in 60 seconds.</p>
      </div>

      {serverError && (
        <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <TextField
          name="fullName"
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={setFullName}
          error={nameError}
          required
        />
        <TextField
          name="email"
          label="Work email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={emailError}
          required
        />
        <div className="flex flex-col gap-1.5">
          <PasswordField
            name="password"
            label="Password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            error={passwordError}
            required
          />
          {password.length > 0 && <PasswordStrength password={password} />}
        </div>
        <TextField
          name="company"
          label="Company name"
          autoComplete="organization"
          value={company}
          onChange={setCompany}
          error={companyError}
          required
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-3">
            <input
              id="signup-agree"
              name="agree"
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              aria-invalid={agreeError ? "true" : undefined}
              aria-describedby={agreeError ? "signup-agree-error" : undefined}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-web-brand focus:ring-web-brand"
            />
            <label htmlFor="signup-agree" className="text-sm leading-relaxed text-slate-700">
              I agree to the{" "}
              <Link href="/terms" className="font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
                Privacy Policy
              </Link>
            </label>
          </div>
          {agreeError ? (
            <p id="signup-agree-error" role="alert" className="text-sm text-red-600">{agreeError}</p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-web-brand py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-web-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {loading && <Spinner />}
          {loading ? "Creating account…" : "Create free account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
          Log in
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-slate-500">No credit card required · Read-only database access</p>
    </div>
  )
}
