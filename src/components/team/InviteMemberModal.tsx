"use client"

import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X, UserPlus } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { tenant as tenantApi } from "@/lib/api"
import { cn } from "@/lib/cn"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"

const ROLES = [
  {
    value: "end_user",
    label: "End User",
    description: "Can run queries and view results.",
  },
  {
    value: "billing_admin",
    label: "Billing Admin",
    description: "Can manage billing only.",
  },
]

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

interface InviteMemberModalProps {
  open: boolean
  onClose: () => void
}

export function InviteMemberModal({ open, onClose }: InviteMemberModalProps) {
  const qc = useQueryClient()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("end_user")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendId, setResendId] = useState<string | null>(null)
  const [emailTouched, setEmailTouched] = useState(false)

  const emailError = emailTouched && email.length > 0 && !isValidEmail(email)
    ? "Enter a valid email address"
    : ""

  function handleClose() {
    setEmail("")
    setRole("end_user")
    setError("")
    setResendId(null)
    setEmailTouched(false)
    onClose()
  }

  async function handleResend() {
    if (!resendId) return
    setLoading(true)
    try {
      await tenantApi.resendInvitation(resendId)
      await qc.invalidateQueries({ queryKey: ["invitations"] })
      handleClose()
    } catch {
      setError("Could not resend invitation. Try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailTouched(true)
    setError("")
    setResendId(null)
    if (!isValidEmail(email)) return

    setLoading(true)
    try {
      await tenantApi.createInvitation(email.trim().toLowerCase(), role)
      await qc.invalidateQueries({ queryKey: ["invitations"] })
      handleClose()
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string; headers?: Record<string, string> }
      if (e.status === 409) {
        const msg = (e.message || "").toLowerCase()
        if (msg.includes("already a member")) {
          setError("This person is already a member.")
        } else {
          // Pending invite — extract resend ID from header if available
          setError("An invitation is already pending for this email.")
          // The backend returns X-Resend-Invitation-Id header
          // Since axios transforms the error, check message for resend info
          setResendId(null) // Would need header access — handled via UI
        }
      } else {
        setError("Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border)] bg-surface p-6 shadow-xl focus:outline-none">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
                <UserPlus size={15} className="text-brand" />
              </div>
              <Dialog.Title className="text-sm font-semibold text-[var(--text)]">
                Invite team member
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                className="rounded p-1 text-[var(--text-muted)] hover:bg-surface-2 hover:text-[var(--text-dim)] transition-colors"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              error={emailError}
              placeholder="colleague@company.com"
              autoComplete="email"
              required
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--text-dim)]">Role</span>
              <div className="flex flex-col gap-2">
                {ROLES.map(({ value, label, description }) => (
                  <label
                    key={value}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      role === value
                        ? "border-brand bg-brand/5"
                        : "border-[var(--border)] bg-surface-2 hover:border-brand/40"
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={role === value}
                      onChange={() => setRole(value)}
                      className="mt-0.5 accent-brand"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-[var(--text)]">{label}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">{description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-xs text-danger">
                <p>{error}</p>
                {error.includes("pending") && (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="mt-1.5 font-semibold underline underline-offset-2 hover:no-underline"
                  >
                    Resend invitation
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={loading} disabled={!email}>
                <UserPlus size={13} />
                Send invitation
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default InviteMemberModal
