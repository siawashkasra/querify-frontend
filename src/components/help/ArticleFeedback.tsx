"use client"

import { useState } from "react"
import { ThumbsDown, ThumbsUp } from "lucide-react"
import { cn } from "@/lib/cn"

export default function ArticleFeedback() {
  const [v, setV] = useState<"yes" | "no" | null>(null)
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
      <p className="text-sm font-medium text-slate-800">Was this helpful?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setV("yes")} className={cn("inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand", v === "yes" ? "border-web-brand bg-web-brand-light text-web-brand" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")} aria-pressed={v === "yes"}>
          <ThumbsUp className="h-4 w-4" aria-hidden /> Yes
        </button>
        <button type="button" onClick={() => setV("no")} className={cn("inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand", v === "no" ? "border-web-brand bg-web-brand-light text-web-brand" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")} aria-pressed={v === "no"}>
          <ThumbsDown className="h-4 w-4" aria-hidden /> No
        </button>
      </div>
      {v ? <p className="mt-3 text-sm text-slate-600" role="status">Thanks for the feedback.</p> : null}
    </div>
  )
}
