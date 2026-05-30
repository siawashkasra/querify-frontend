"use client"

import { useLayoutEffect, useMemo, useState } from "react"
import Link from "next/link"
import { auth } from "@/lib/api"
import TextField from "./TextField"
import Spinner from "./Spinner"
import { isValidEmail, nonEmpty } from "./authValidation"

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitCount, setSubmitCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const emailError = useMemo(() => {
    if (email.length > 0 && !isValidEmail(email)) return "Enter a valid email address"
    if (submitAttempted && !nonEmpty(email)) return "Enter your email"
    return ""
  }, [email, submitAttempted])

  useLayoutEffect(() => {
    if (success || submitCount === 0) return
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>("form [aria-invalid='true']")
      el?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [submitCount, success])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitAttempted(true)
    setSubmitCount((c) => c + 1)
    if (!isValidEmail(email)) return

    setLoading(true)
    try {
      await auth.forgotPassword(email)
    } catch {
      // Always show success — never reveal if email exists
    } finally {
      setLoading(false)
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-medium text-slate-900" role="status">
          If this email exists, we sent a reset link.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Check your inbox — the link expires in 1 hour.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm"
        >
          Back to log in
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Reset your password
        </h1>
        <p className="mt-2 text-slate-600">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>
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
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-web-brand py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-web-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {loading && <Spinner />}
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link
          href="/login"
          className="font-medium text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm"
        >
          Back to log in
        </Link>
      </p>
    </div>
  )
}
