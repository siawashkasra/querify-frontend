import Link from "next/link"
import SectionShell from "@/components/website/landing/SectionShell"
import { ShieldCheck } from "lucide-react"

const SUBPROCESSORS = [
  { name: "Railway", role: "Application hosting (backend)", href: "https://docs.railway.app/reference/security" },
  { name: "Vercel", role: "Web application hosting (frontend)", href: "https://vercel.com/security" },
  { name: "Supabase", role: "Managed data services", href: "https://supabase.com/security" },
] as const

export default function SecurityContent() {
  return (
    <div className="pb-16 pt-8 md:pb-24 md:pt-12">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-hero-sm font-bold tracking-tight text-slate-900 sm:text-hero-md md:text-hero-lg">Your database is safe with Querify</h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600 sm:text-xl">We designed Querify from the ground up for security. Here is exactly how we protect your data and your database.</p>
      </header>
      <SectionShell className="pt-8 md:pt-12">
        <div className="mx-auto max-w-4xl rounded-2xl border-2 border-web-brand/40 bg-web-brand-light/40 p-8 shadow-md ring-1 ring-web-brand/20 md:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-web-brand text-white shadow-lg">
              <ShieldCheck className="h-8 w-8" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-web-brand">Read-only guarantee</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">We cannot write to your database</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-700">Querify connects with credentials that only allow read access. That means we can answer questions from your data, but we cannot insert, update, or delete rows — and we cannot change schema.</p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">Querify uses AST-level SQL validation to ensure every query is a SELECT statement. Write operations are structurally blocked before they can reach your database.</p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">If something looks like a write, it never leaves our system. Your database only ever sees read-only traffic from Querify.</p>
            </div>
          </div>
        </div>
      </SectionShell>
      <SectionShell>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Credential security</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>Connection credentials are encrypted at rest using AES-256-compatible encryption (Fernet-style symmetric encryption). We never store passwords in plain text.</p>
            <p>We store what we need to keep your connection working: the encrypted secret, host, database name, and non-secret metadata. We do not store unnecessary copies of your data or credentials beyond what is required for the service.</p>
            <p>
              For the strongest security model, use a dedicated database user with SELECT-only permissions.{" "}
              <Link href="/help/database-setup/read-only-user" className="font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
                Follow our read-only user guide
              </Link>
              {" "}to set that up in minutes.
            </p>
            <p>If your network policy requires it, you can allowlist Querify’s static IP addresses so only our infrastructure can reach your database.</p>
          </div>
        </div>
      </SectionShell>
      <SectionShell className="bg-slate-50/80">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Data minimisation</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>We store your prompts, query metadata (timing, status), and a small preview of results (typically up to five rows) so you can see history in the product.</p>
            <p>We do not store full result sets or bulk exports of your business data.</p>
            <p>Retention follows your workspace settings and applicable law. You can request deletion of your workspace data, and we will honour it within a reasonable timeframe.</p>
          </div>
        </div>
      </SectionShell>
      <SectionShell>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Infrastructure</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">Querify runs on modern infrastructure: Railway (backend), Vercel (frontend), and Supabase (managed database services). All traffic between you and Querify uses TLS 1.2+ in transit.</p>
          <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-900">Sub-processor</th>
                  <th className="px-4 py-3 font-semibold text-slate-900">Role</th>
                  <th className="px-4 py-3 font-semibold text-slate-900">Security</th>
                </tr>
              </thead>
              <tbody>
                {SUBPROCESSORS.map((s) => (
                  <tr key={s.name} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.role}</td>
                    <td className="px-4 py-3">
                      <a href={s.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
                        Security overview
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionShell>
      <SectionShell className="bg-slate-50/80">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Compliance</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>We take GDPR seriously. We process personal data only as needed to run the service, support you, and meet legal obligations. We work with EU customers under standard contractual clauses where required.</p>
            <p>A Data Processing Addendum (DPA) is available for customers who need it for EU operations.</p>
            <p>
              For security reviews, questionnaires, or incident reports:{" "}
              <a href="mailto:security@querify.ai" className="font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
                security@querify.ai
              </a>
            </p>
          </div>
        </div>
      </SectionShell>
      <div className="mx-auto max-w-3xl py-12 text-center md:py-16">
        <p className="text-lg font-medium text-slate-900">Questions about security?</p>
        <a href="mailto:security@querify.ai?subject=Security%20question" className="mt-3 inline-block text-base font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
          Email us at security@querify.ai
        </a>
        <p className="mt-10 text-sm text-slate-500">
          <Link href="/privacy" className="text-slate-600 underline-offset-4 hover:text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">Privacy Policy</Link>
          <span className="mx-2 text-slate-300" aria-hidden>·</span>
          <Link href="/terms" className="text-slate-600 underline-offset-4 hover:text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">Terms of Service</Link>
        </p>
      </div>
    </div>
  )
}
