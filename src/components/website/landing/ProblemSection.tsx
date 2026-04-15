import SectionShell from "./SectionShell"
import SectionHeading from "@/components/website/shared/SectionHeading"
import { ArrowRight, Clock, MessageSquare } from "lucide-react"

export default function ProblemSection() {
  return (
    <SectionShell className="bg-slate-50/80">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="The problem" title="Your business data is in your database. Getting to it shouldn't require an engineer." />
        <div className="mt-6 max-w-3xl space-y-4 text-base leading-relaxed text-slate-600">
          <p>Every week you send data requests to your engineering team.</p>
          <p>Every week you wait. By the time you have the numbers, the moment has passed.</p>
          <p className="font-medium text-slate-800">Querify fixes this.</p>
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">The old way</p>
            <ul className="mt-4 flex flex-col gap-4">
              <li className="flex gap-3 text-sm text-slate-700">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><MessageSquare className="h-4 w-4" aria-hidden /></span>
                <span>You send another request to engineering</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-700">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Clock className="h-4 w-4" aria-hidden /></span>
                <span>You wait days for a reply</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-700">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><ArrowRight className="h-4 w-4" aria-hidden /></span>
                <span>You work from numbers that are already old</span>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-web-brand/25 bg-white p-6 shadow-md ring-1 ring-web-brand/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-web-brand">With Querify</p>
            <ul className="mt-4 flex flex-col gap-4">
              <li className="flex gap-3 text-sm text-slate-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-web-brand-light text-web-brand font-bold text-xs">1</span>
                <span>Connect your database once with read-only access</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-web-brand-light text-web-brand font-bold text-xs">2</span>
                <span>Ask any business question in plain English</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-web-brand-light text-web-brand font-bold text-xs">3</span>
                <span>Get answers with charts and tables in seconds</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
