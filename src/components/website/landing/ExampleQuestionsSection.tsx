"use client"

import { useState } from "react"
import Image from "next/image"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import SectionShell from "./SectionShell"
import { trackCta } from "./ctaTrack"

const QUESTIONS = [
  "What is my MRR this month compared to last month?",
  "Which customers churned in the last 30 days?",
  "Who are my top 10 customers by lifetime value?",
  "How many users signed up this week vs last week?",
  "Which plan has the best retention rate?",
  "Show me revenue by month for the last 12 months",
] as const

export default function ExampleQuestionsSection() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  return (
    <SectionShell className="bg-slate-50/80">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Questions Querify answers instantly</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-3">
          {QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => { trackCta("example_questions", q); setActive(q); setOpen(true) }}
              className="max-w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm transition-colors hover:border-web-brand/40 hover:bg-web-brand-light/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand sm:text-center"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(100vw-2rem,560px)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <Dialog.Close className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
            <Dialog.Title className="pr-10 text-left text-base font-semibold leading-snug text-slate-900">{active}</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-500">Preview — your data will look different.</Dialog.Description>
            <div className="relative mt-4 aspect-[720/420] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <Image src="/images/example-result-placeholder.png" alt="Example answer with chart and summary" fill className="object-contain" sizes="(max-width: 560px) 100vw, 560px" />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">Querify returns a short summary, a chart or table, and the SQL behind it so you or your team can check the work.</p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </SectionShell>
  )
}
