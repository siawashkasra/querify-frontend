"use client"

import { useLayoutEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { track } from "@/lib/analytics"
import TextField from "./TextField"
import PasswordField from "./PasswordField"
import { isValidEmail, isValidPassword, nonEmpty } from "./authValidation"

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitCount, setSubmitCount] = useState(0)

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitAttempted(true)
    setSubmitCount((c) => c + 1)
    if (!isValidEmail(email) || !isValidPassword(password)) return
    track("login_attempted", { source: "website" })
    router.push("/signup?notice=early_access")
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Welcome back</h1>
      </div>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <TextField name="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} error={emailError} required />
        <div className="flex flex-col gap-1">
          <PasswordField name="password" label="Password" autoComplete="current-password" value={password} onChange={setPassword} error={passwordError} required />
          <Link href="/forgot-password" className="self-end text-sm font-medium text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
            Forgot password?
          </Link>
        </div>
        <button type="submit" className="w-full rounded-lg bg-web-brand py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-web-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2">
          Log in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        No account?{" "}
        <Link href="/signup" className="font-semibold text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">Sign up free</Link>
      </p>
    </div>
  )
}
