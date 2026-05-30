"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/lib/toast"
import { auth } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import TextField from "@/components/website/auth/TextField"
import PasswordField from "@/components/website/auth/PasswordField"
import PasswordStrength from "@/components/website/auth/PasswordStrength"
import Spinner from "@/components/website/auth/Spinner"
import { isValidPassword, nonEmpty } from "@/components/website/auth/authValidation"
import type { TokenPair } from "@/lib/api"

type PageState =
  | { kind: "loading" }
  | { kind: "setup_password"; setupToken: string }
  | { kind: "done" }
  | { kind: "error"; message: string }

export default function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { establishSession } = useAuth()
  const token = searchParams.get("token") ?? ""
  const ran = useRef(false)

  const [pageState, setPageState] = useState<PageState>({ kind: "loading" })

  // Setup password form state
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState("")

  const nameError = useMemo(() => {
    if (submitAttempted && !nonEmpty(name)) return "Enter your name"
    return ""
  }, [name, submitAttempted])

  const passwordError = useMemo(() => {
    if (password.length > 0 && !isValidPassword(password)) return "Use at least 8 characters"
    if (submitAttempted && !nonEmpty(password)) return "Choose a password"
    return ""
  }, [password, submitAttempted])

  const confirmError = useMemo(() => {
    if (confirm.length > 0 && confirm !== password) return "Passwords do not match"
    if (submitAttempted && !nonEmpty(confirm)) return "Confirm your password"
    return ""
  }, [confirm, password, submitAttempted])

  // Step 1: accept the invitation
  useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (!token) {
      setPageState({ kind: "error", message: "No invitation token found." })
      return
    }

    auth.acceptInvite(token)
      .then(async (result) => {
        if (result.requires_password_setup && result.setup_token) {
          // New user — show password setup form
          setPageState({ kind: "setup_password", setupToken: result.setup_token })
        } else if (result.access_token && result.refresh_token) {
          // Existing user — establish session and redirect
          const tokens: TokenPair = {
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            expires_in: result.expires_in ?? 900,
          }
          await establishSession(tokens)
          toast.success("You have joined the team!")
          setPageState({ kind: "done" })
          router.push("/dashboard")
        } else {
          setPageState({ kind: "error", message: "Unexpected response from server." })
        }
      })
      .catch((err: { status?: number }) => {
        if (err.status === 400) {
          setPageState({ kind: "error", message: "This invitation is invalid or has expired." })
        } else {
          setPageState({ kind: "error", message: "Something went wrong accepting the invitation." })
        }
      })
  }, [token, establishSession, router])

  // Step 2: complete password setup for new users
  async function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitAttempted(true)
    setFormError("")
    if (!nonEmpty(name) || !isValidPassword(password) || confirm !== password) return

    const setupToken = pageState.kind === "setup_password" ? pageState.setupToken : ""
    setLoading(true)
    try {
      const result = await auth.completeInviteSetup(setupToken, name, password)
      const tokens = result as TokenPair
      await establishSession(tokens)
      toast.success("Account created! Welcome to the team.")
      setPageState({ kind: "done" })
      router.push("/dashboard")
    } catch (err: unknown) {
      const e = err as { status?: number }
      if (e.status === 400 || e.status === 404) {
        setFormError("This setup link is invalid or has expired. Ask your admin to resend the invitation.")
      } else {
        setFormError("Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (pageState.kind === "loading") {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Spinner className="mx-auto h-8 w-8 text-web-brand" />
        <p className="mt-4 text-slate-700 font-medium" role="status">Accepting your invitation…</p>
      </div>
    )
  }

  if (pageState.kind === "done") {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Spinner className="mx-auto h-8 w-8 text-web-brand" />
        <p className="mt-4 text-slate-700 font-medium" role="status">Redirecting…</p>
      </div>
    )
  }

  if (pageState.kind === "error") {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Invitation not valid</h1>
        <p className="mt-2 text-sm text-slate-600">{pageState.message}</p>
        <p className="mt-4 text-sm text-slate-500">Ask your team admin to send a new invitation.</p>
      </div>
    )
  }

  // Setup password form for new users
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Create your account
        </h1>
        <p className="mt-2 text-slate-600">You have been invited to join a team on Querify.</p>
      </div>

      {formError && (
        <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <form onSubmit={handleSetupSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <TextField
          name="name"
          label="Your name"
          autoComplete="name"
          value={name}
          onChange={setName}
          error={nameError}
          required
        />
        <div className="flex flex-col gap-1.5">
          <PasswordField
            name="password"
            label="Create a password"
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
          {loading ? "Creating account…" : "Create account & join team"}
        </button>
      </form>
    </div>
  )
}
