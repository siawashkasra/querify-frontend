import SectionShell from "./SectionShell"
import { BookOpen, Lock, Minimize2, Network, ShieldCheck, UserRoundCog } from "lucide-react"
import type { LucideIcon } from "lucide-react"

const ITEMS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ShieldCheck, title: "Read-only guarantee", body: "We never write to your database or change your data." },
  { icon: Lock, title: "AES-256 encryption", body: "Traffic is encrypted in transit between you and Querify." },
  { icon: BookOpen, title: "Dedicated read-only user guide", body: "Step-by-step setup so your team stays in control." },
  { icon: Network, title: "Static IP whitelisting", body: "Lock access to known Querify addresses if your policy requires it." },
  { icon: Minimize2, title: "Data minimisation", body: "We pull what we need to answer questions—nothing extra." },
  { icon: UserRoundCog, title: "You stay in control", body: "Disconnect anytime; your database stays yours." },
]

export default function SecuritySection() {
  return (
    <SectionShell>
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Your database. Your data. Always.</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {ITEMS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-web-brand-light text-web-brand">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}
