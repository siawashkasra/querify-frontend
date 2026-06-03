"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import {
  Mail, Bold, Italic, Link2, AlignLeft,
  Loader2, AlertTriangle, CheckCircle2, Send, Eye, EyeOff,
} from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { EmailSendRequest } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return d
}

const PLAN_OPTIONS = ["free", "starter", "pro", "team"]

// ── Rich text toolbar ─────────────────────────────────────────────────────────

function ToolbarButton({
  onClick, title, active, children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded text-xs transition-colors",
        active ? "bg-violet-100 text-violet-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      )}
    >
      {children}
    </button>
  )
}

// ── Recipient selector ────────────────────────────────────────────────────────

interface RecipientState {
  type: "tenant" | "plan"
  tenantId: string
  tenantName: string
  plan: string
}

function RecipientSelector({
  value, onChange,
}: {
  value: RecipientState
  onChange: (v: RecipientState) => void
}) {
  const [tenantQuery, setTenantQuery] = useState("")
  const debouncedQuery = useDebounce(tenantQuery, 300)
  const [tenantResults, setTenantResults] = useState<{ tenant_id: string; name: string; plan_name: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (debouncedQuery.length < 2) { setTenantResults([]); return }
    setSearching(true)
    adminApi.tenantSearch(debouncedQuery).then((r) => {
      setTenantResults(r)
      setShowDropdown(true)
    }).finally(() => setSearching(false))
  }, [debouncedQuery])

  return (
    <div className="flex flex-col gap-3">
      {/* Type toggle */}
      <div className="flex gap-2">
        {(["tenant", "plan"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange({ ...value, type: t, tenantId: "", tenantName: "", plan: "free" })}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg font-medium border transition-colors",
              value.type === t
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            )}
          >
            {t === "tenant" ? "Specific tenant" : "All on plan"}
          </button>
        ))}
      </div>

      {value.type === "tenant" ? (
        <div className="relative">
          <input
            type="text"
            placeholder="Search tenant by name…"
            value={value.tenantId ? value.tenantName : tenantQuery}
            onChange={(e) => {
              onChange({ ...value, tenantId: "", tenantName: "" })
              setTenantQuery(e.target.value)
            }}
            onFocus={() => tenantResults.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
          {searching && (
            <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
          )}
          {showDropdown && tenantResults.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
              {tenantResults.map((t) => (
                <button
                  key={t.tenant_id}
                  type="button"
                  onMouseDown={() => {
                    onChange({ ...value, tenantId: t.tenant_id, tenantName: t.name })
                    setTenantQuery("")
                    setShowDropdown(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-violet-50 flex items-center justify-between"
                >
                  <span className="font-medium text-gray-800">{t.name}</span>
                  <span className="text-xs text-gray-400">{t.plan_name}</span>
                </button>
              ))}
            </div>
          )}
          {value.tenantId && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle2 size={11} />
              {value.tenantName} selected
            </p>
          )}
        </div>
      ) : (
        <select
          value={value.plan}
          onChange={(e) => onChange({ ...value, plan: e.target.value })}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        >
          {PLAN_OPTIONS.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)} — all tenants on this plan</option>
          ))}
        </select>
      )}
    </div>
  )
}

// ── Rich text editor ──────────────────────────────────────────────────────────

function RichTextEditor({
  value, onChange,
}: {
  value: string
  onChange: (html: string) => void
}) {
  const editorRef = useRef<HTMLDivElement>(null)

  function execCmd(cmd: string, arg?: string) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, arg)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  function insertLink() {
    const url = window.prompt("Enter URL:")
    if (url) execCmd("createLink", url)
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <ToolbarButton onClick={() => execCmd("bold")} title="Bold (Ctrl+B)">
          <Bold size={13} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCmd("italic")} title="Italic (Ctrl+I)">
          <Italic size={13} />
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolbarButton onClick={insertLink} title="Insert link">
          <Link2 size={13} />
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolbarButton onClick={() => execCmd("formatBlock", "<p>")} title="Paragraph">
          <AlignLeft size={13} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCmd("formatBlock", "<h2>")} title="Heading">
          <span className="text-[11px] font-bold">H</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => execCmd("insertUnorderedList")} title="Bullet list">
          <span className="text-[11px]">•</span>
        </ToolbarButton>
      </div>
      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => {
          if (editorRef.current) onChange(editorRef.current.innerHTML)
        }}
        dangerouslySetInnerHTML={{ __html: value }}
        className={cn(
          "min-h-[200px] p-4 text-sm text-gray-800 focus:outline-none",
          "prose prose-sm max-w-none",
          "[&_a]:text-violet-600 [&_a]:underline",
          "[&_ul]:list-disc [&_ul]:ml-4",
          "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900"
        )}
      />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EmailSenderPage() {
  const [recipient, setRecipient] = useState<RecipientState>({
    type: "tenant",
    tenantId: "",
    tenantName: "",
    plan: "free",
  })
  const [subject, setSubject] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [confirmInput, setConfirmInput] = useState("")
  const [sendResult, setSendResult] = useState<{ sent_count: number } | null>(null)

  const sendMutation = useMutation({
    mutationFn: (req: EmailSendRequest) => adminApi.sendEmail(req),
    onSuccess: (data) => {
      setSendResult(data)
      setConfirmInput("")
    },
  })

  const recipientLabel = recipient.type === "tenant"
    ? recipient.tenantName || "No tenant selected"
    : `All ${recipient.plan} tenants`

  const isReadyToSend =
    subject.trim().length > 0 &&
    bodyHtml.trim().length > 10 &&
    (recipient.type === "plan" || recipient.tenantId !== "") &&
    confirmInput === "SEND"

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!isReadyToSend) return
    const req: EmailSendRequest = {
      recipient_type: recipient.type,
      ...(recipient.type === "tenant" ? { recipient_id: recipient.tenantId } : { recipient_plan: recipient.plan }),
      subject: subject.trim(),
      body_html: bodyHtml,
    }
    sendMutation.mutate(req)
  }

  if (sendResult) {
    return (
      <div className="p-6 max-w-[700px] mx-auto">
        <div className="bg-white rounded-xl border border-green-200 p-8 text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">Email sent</p>
            <p className="text-sm text-gray-500 mt-1">
              {sendResult.sent_count.toLocaleString()} recipient{sendResult.sent_count !== 1 ? "s" : ""} · logged in audit log
            </p>
          </div>
          <button
            onClick={() => {
              setSendResult(null)
              setSubject("")
              setBodyHtml("")
              setRecipient({ type: "tenant", tenantId: "", tenantName: "", plan: "free" })
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Send another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[900px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Mail size={18} className="text-gray-400" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Email Sender</h1>
          <p className="text-sm text-gray-400 mt-0.5">Send emails to specific tenants or all tenants on a plan. All sends are logged.</p>
        </div>
      </div>

      <form onSubmit={handleSend} className="flex flex-col gap-5">
        {/* Recipient */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Recipient</label>
          <RecipientSelector value={recipient} onChange={setRecipient} />
        </div>

        {/* Subject */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
          <input
            type="text"
            placeholder="Email subject…"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </div>

        {/* Body */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-700">Body</label>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPreview ? "Edit" : "Preview"}
            </button>
          </div>

          {showPreview ? (
            /* Preview pane */
            <div className="min-h-[200px] border border-gray-200 rounded-xl bg-white p-5">
              <div className="border-b border-gray-100 pb-3 mb-4">
                <p className="text-xs text-gray-400">To: <span className="text-gray-700">{recipientLabel}</span></p>
                <p className="text-xs text-gray-400 mt-0.5">Subject: <span className="font-medium text-gray-800">{subject || "(no subject)"}</span></p>
              </div>
              {bodyHtml ? (
                <div
                  className="prose prose-sm max-w-none text-gray-800 [&_a]:text-violet-600 [&_ul]:list-disc [&_ul]:ml-4"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              ) : (
                <p className="text-sm text-gray-300 italic">No body yet.</p>
              )}
            </div>
          ) : (
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
          )}
        </div>

        {/* Confirmation gate */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Confirm before sending</p>
              <p className="text-xs text-amber-700 mt-0.5">
                This will send to: <strong>{recipientLabel}</strong>.
                Type <span className="font-mono font-bold bg-amber-100 px-1 rounded">SEND</span> to unlock the send button.
              </p>
            </div>
          </div>
          <input
            type="text"
            placeholder='Type "SEND" to confirm…'
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/30 placeholder:text-amber-300"
          />
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!isReadyToSend || sendMutation.isPending}
          className={cn(
            "flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-colors",
            isReadyToSend && !sendMutation.isPending
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {sendMutation.isPending ? (
            <><Loader2 size={15} className="animate-spin" /> Sending…</>
          ) : (
            <><Send size={15} /> Send email</>
          )}
        </button>

        {sendMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700 font-medium">Send failed</p>
            <p className="text-xs text-red-600 mt-0.5">{(sendMutation.error as Error).message}</p>
          </div>
        )}
      </form>
    </div>
  )
}
