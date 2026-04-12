export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-brand" />
        <span className="text-2xl font-semibold tracking-tight text-[var(--text)]">Querify</span>
      </div>
      <p className="text-[var(--text-dim)] text-sm">Phase 2 frontend scaffold ready.</p>
      <div className="flex gap-3 text-xs font-mono text-[var(--text-muted)]">
        <span className="rounded bg-[var(--surface)] px-2 py-1 border border-[var(--border)]">React Query ✓</span>
        <span className="rounded bg-[var(--surface)] px-2 py-1 border border-[var(--border)]">Zustand ✓</span>
        <span className="rounded bg-[var(--surface)] px-2 py-1 border border-[var(--border)]">Recharts ✓</span>
        <span className="rounded bg-[var(--surface)] px-2 py-1 border border-[var(--border)]">Radix UI ✓</span>
      </div>
    </main>
  )
}
