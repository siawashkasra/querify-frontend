import SectionShell from "./SectionShell"
import SectionHeading from "@/components/website/shared/SectionHeading"

const STEPS = [
  { n: "1", title: "Connect your database", body: "60 seconds, read-only access." },
  { n: "2", title: "Querify learns your data", body: "Automatic, no configuration." },
  { n: "3", title: "Ask in plain English", body: "Any business question." },
  { n: "4", title: "Get answers with charts", body: "Summary, chart, SQL for verification." },
] as const

export default function HowItWorksSection() {
  return (
    <SectionShell id="how-it-works">
      <div className="mx-auto max-w-6xl">
        <SectionHeading align="center" title="How it works" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-web-brand text-sm font-bold text-white">{s.n}</span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}
