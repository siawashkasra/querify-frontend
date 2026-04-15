"use client"

import { useLayoutEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { track } from "@/lib/analytics"
import TextField from "./TextField"
import PasswordField from "./PasswordField"
import { isValidEmail, isValidPassword, nonEmpty } from "./authValidation"

export default function SignupForm() {
  const searchParams = useSearchParams()
  const fromLogin = searchParams.get("notice") === "early_access"
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [company, setCompany] = useState("")
  const [agree, setAgree] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitCount, setSubmitCount] = useState(0)
  const [success, setSuccess] = useState(false)

  const nameError = useMemo(() => {
    if (fullName.length > 0 && !nonEmpty(fullName)) return "Enter your full name"
    if (submitAttempted && !nonEmpty(fullName)) return "Enter your full name"
    return ""
  }, [fullName, submitAttempted])

  const emailError = useMemo(() => {
    if (email.length > 0 && !isValidEmail(email)) return "Enter a valid email address"
    if (submitAttempted && !nonEmpty(email)) return "Enter your work email"
    return ""
  }, [email, submitAttempted])

  const passwordError = useMemo(() => {
    if (password.length > 0 && !isValidPassword(password)) return "Use at least 8 characters"
    if (submitAttempted && !nonEmpty(password)) return "Enter a password"
    return ""
  }, [password, submitAttempted])

  const companyError = useMemo(() => {
    if (company.length > 0 && !nonEmpty(company)) return "Enter your company name"
    if (submitAttempted && !nonEmpty(company)) return "Enter your company name"
    return ""
  }, [company, submitAttempted])

  const agreeError = useMemo(() => {
    if (!submitAttempted) return ""
    if (!agree) return "You must agree to the Terms of Service and Privacy Policy"
    return ""
  }, [agree, submitAttempted])

  useLayoutEffect(() => {
    if (success || submitCount === 0) return
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>("form [aria-invalid='true']")
      el?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [submitCount, success])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitAttempted(true)
    setSubmitCount((c) => c + 1)
    const ok = nonEmpty(fullName) && isValidEmail(email) && isValidPassword(password) && nonEmpty(company) && agree
    if (!ok) return
    track("signup_attempted", { source: "website" })
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-lg font-semibold text-slate-900" role="status">You are on the list! We will email you when access is ready. In the meantime, follow our launch on{" "}
          <a href="https://twitter.com/querify" target="_blank" rel="noopener noreferrer" className="font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
            Twitter
          </a>
          .
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">Back to home</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {fromLogin ? (
        <div className="mb-6 rounded-lg border border-web-brand/30 bg-web-brand-light/50 px-4 py-3 text-sm text-slate-800" role="status">
          Early access is launching soon. Sign up to be notified.
        </div>
      ) : null}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Start asking your data questions</h1>
        <p className="mt-2 text-slate-600">Connect your database in 60 seconds.</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <TextField name="fullName" label="Full name" autoComplete="name" value={fullName} onChange={setFullName} error={nameError} required />
        <TextField name="email" label="Work email" type="email" autoComplete="email" value={email} onChange={setEmail} error={emailError} required />
        <PasswordField name="password" label="Password" autoComplete="new-password" value={password} onChange={setPassword} error={passwordError} required />
        <TextField name="company" label="Company name" autoComplete="organization" value={company} onChange={setCompany} error={companyError} required />
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
              </Link>
              {" "}and{" "}
              <Link href="/privacy" className="font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
                Privacy Policy
              </Link>
            </label>
          </div>
          {agreeError ? <p id="signup-agree-error" role="alert" className="text-sm text-red-600">{agreeError}</p> : null}
        </div>
        <button type="submit" className="mt-1 w-full rounded-lg bg-web-brand py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-web-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2 disabled:opacity-50">
          Create free account
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">Log in</Link>
      </p>
      <p className="mt-4 text-center text-xs text-slate-500">No credit card required · Read-only database access</p>
    </div>
  )
}
