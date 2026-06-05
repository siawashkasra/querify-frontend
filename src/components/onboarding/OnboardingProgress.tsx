"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Check } from "lucide-react"
import { connections } from "@/lib/api"
import { track } from "@/lib/analytics"
import { cn } from "@/lib/cn"
import type { PipelineStage, PipelineStatus } from "@/types"

const STEPS = [
  { id: "introspection", label: "Reading schema" },
  { id: "context", label: "Understanding data" },
  { id: "model", label: "Verifying with data" },
  { id: "insights", label: "Finding insights" },
] as const

const STAGE_TO_STEP: Record<string, number> = { introspection: 0, context: 1, model: 2, insights: 3, complete: 4 }

const CONTEXT_MESSAGES = [
  "Identifying your revenue metrics...",
  "Mapping your customer journey...",
  "Learning your business model...",
]

const MAIN_MESSAGES: Record<string, string> = {
  introspection: "Reading your database structure...",
  context: "Understanding what your data means...",
  model: "Checking my reading against your real data...",
  insights: "Generating your first insights...",
  complete: "All done!",
}

const POLL_MS = 2000
const TIMEOUT_MS = 100_000

export interface OnboardingProgressProps {
  connectionId: string
  onComplete: (insightsCount: number, requiresConfirmation: boolean) => void
  onFallback: (reason: string) => void
}

export const OnboardingProgress = ({ connectionId, onComplete, onFallback }: OnboardingProgressProps) => {
  const [status, setStatus] = useState<PipelineStatus>({ stage: "introspection", progress_pct: 5, insights_count: 0 })
  const [contextMsgIdx, setContextMsgIdx] = useState(0)
  const [prevSubText, setPrevSubText] = useState("")
  const [subTextKey, setSubTextKey] = useState(0)
  const [exiting, setExiting] = useState(false)
  const startMs = useRef(Date.now())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const trackedStages = useRef(new Set<string>())
  const doneRef = useRef(false)

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  const trackStage = useCallback((stage: string) => {
    if (trackedStages.current.has(stage)) return
    trackedStages.current.add(stage)
    track("onboarding_progress_reached", { stage, connection_id: connectionId })
  }, [connectionId])

  useEffect(() => {
    if (status.stage !== "context") return
    cycleRef.current = setInterval(() => {
      setContextMsgIdx((i) => (i + 1) % CONTEXT_MESSAGES.length)
      setSubTextKey((k) => k + 1)
    }, 3000)
    return () => { if (cycleRef.current) clearInterval(cycleRef.current) }
  }, [status.stage])

  const getSubText = useCallback((s: PipelineStatus): string => {
    if (s.stage === "introspection") return "Scanning tables, columns, and relationships..."
    if (s.stage === "context") return CONTEXT_MESSAGES[contextMsgIdx]
    if (s.stage === "model") return "Sampling values to verify measures and entities..."
    if (s.stage === "insights") return `Almost ready — ${s.insights_count} of 3 insights found`
    return ""
  }, [contextMsgIdx])

  const poll = useCallback(async () => {
    if (doneRef.current) return
    if (Date.now() - startMs.current > TIMEOUT_MS) {
      stopPolling()
      track("onboarding_fallback_shown", { reason: "timeout" })
      onFallback("timeout")
      return
    }
    try {
      const s = await connections.pipelineStatus(connectionId)
      const newStage = (s as PipelineStatus).stage
      trackStage(newStage)
      setStatus((prev) => {
        const next = s as PipelineStatus
        const prevSub = getSubText(prev)
        if (prevSub !== getSubText(next)) { setPrevSubText(prevSub); setSubTextKey((k) => k + 1) }
        return next
      })
      if (newStage === "complete") {
        doneRef.current = true
        stopPolling()
        setExiting(true)
        setTimeout(() => onComplete((s as PipelineStatus).insights_count, !!(s as PipelineStatus).requires_confirmation), 500)
      } else if (newStage === "failed") {
        doneRef.current = true
        stopPolling()
        track("onboarding_fallback_shown", { reason: "pipeline_failed" })
        onFallback("pipeline_failed")
      }
    } catch { /* keep polling on network errors */ }
  }, [connectionId, onComplete, onFallback, stopPolling, trackStage, getSubText])

  useEffect(() => {
    trackStage("introspection")
    poll()
    pollRef.current = setInterval(poll, POLL_MS)
    return stopPolling
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activeStep = Math.min(STAGE_TO_STEP[status.stage] ?? 0, STEPS.length - 1)
  const subText = getSubText(status)

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)] transition-opacity duration-500",
      exiting ? "opacity-0 pointer-events-none" : "opacity-100"
    )}>
      <div className="flex flex-col items-center gap-12 w-full max-w-[480px] px-8">
        <span className="text-2xl font-bold tracking-tight text-[var(--brand)]">QUERIFY</span>

        <div className="flex items-center w-full">
          {STEPS.map((step, i) => {
            const isDone = i < activeStep
            const isActive = i === activeStep
            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-2.5 shrink-0">
                  <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center transition-all duration-500",
                    isDone && "bg-[var(--brand)]",
                    isActive && "bg-[var(--brand)] animate-pulse-ring",
                    !isDone && !isActive && "bg-[var(--border)]"
                  )}>
                    {isDone ? (
                      <Check size={15} className="text-white animate-scale-in" strokeWidth={2.5} />
                    ) : isActive ? (
                      <div className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-[var(--text-muted)]" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[11px] font-medium whitespace-nowrap transition-colors duration-300",
                    isDone && "text-[var(--brand)]",
                    isActive && "text-[var(--text)]",
                    !isDone && !isActive && "text-[var(--text-muted)]"
                  )}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px mx-4 mb-7 relative bg-[var(--border)] overflow-hidden rounded-full">
                    <div className={cn(
                      "absolute inset-y-0 left-0 bg-[var(--brand)] transition-all duration-700 rounded-full",
                      isDone ? "w-full" : "w-0"
                    )} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-3 text-center min-h-[72px]">
          <p className="text-lg font-medium text-[var(--text)] transition-all duration-500">
            {MAIN_MESSAGES[status.stage] ?? "Setting things up..."}
          </p>
          <p key={subTextKey} className="text-sm text-[var(--text-muted)] animate-fade-slide-in leading-relaxed">
            {subText || prevSubText}
          </p>
        </div>

        <div className="w-full space-y-2">
          <div className="w-full h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--brand)] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(status.progress_pct, 5)}%` }}
            />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] text-right">{status.progress_pct}%</p>
        </div>
      </div>
    </div>
  )
}

export default OnboardingProgress
