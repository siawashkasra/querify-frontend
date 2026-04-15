"use client"

import { useCallback, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"

export default function PreWithCopy({ children }: { children: React.ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async () => {
    const text = preRef.current?.textContent ?? ""
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }, [])
  return (
    <div className="group relative my-4 rounded-lg border border-slate-200 bg-slate-950">
      <button type="button" onClick={copy} className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200 opacity-0 transition-opacity hover:bg-slate-700 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-web-brand group-hover:opacity-100" aria-label={copied ? "Copied" : "Copy code"}>
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre ref={preRef} className="overflow-x-auto p-4 text-sm leading-relaxed text-slate-100 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit">
        {children}
      </pre>
    </div>
  )
}
