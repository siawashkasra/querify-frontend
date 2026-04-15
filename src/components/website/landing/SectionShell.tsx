import { cn } from "@/lib/cn"

export default function SectionShell({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return <section id={id} className={cn("py-12 md:py-20", className)}>{children}</section>
}
