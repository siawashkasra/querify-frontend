import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Link from "next/link"
import PreWithCopy from "@/components/help/PreWithCopy"
import type { Components } from "react-markdown"

export default function BlogMarkdown({ content, toc }: { content: string; toc: { id: string; text: string }[] }) {
  let h2Idx = 0
  const components: Components = {
    h1: ({ children }) => <h2 className="mt-10 scroll-mt-24 text-2xl font-bold text-slate-900 first:mt-0">{children}</h2>,
    h2: ({ children }) => {
      const t = toc[h2Idx++]
      const id = t?.id ?? `section-${h2Idx}`
      return (
        <h3 id={id} className="mt-10 scroll-mt-24 text-xl font-bold text-slate-900 first:mt-0">
          {children}
        </h3>
      )
    },
    h3: ({ children }) => <h4 className="mt-8 text-lg font-semibold text-slate-900">{children}</h4>,
    p: ({ children }) => <p className="mt-4 text-lg leading-relaxed text-slate-700 first:mt-0">{children}</p>,
    ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 text-lg text-slate-700">{children}</ul>,
    ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-lg text-slate-700">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    a: ({ href, children }) => {
      const h = href ?? ""
      if (h.startsWith("/")) return <Link href={h} className="font-medium text-web-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">{children}</Link>
      return <a href={h} target="_blank" rel="noopener noreferrer" className="font-medium text-web-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">{children}</a>
    },
    blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-web-brand/40 bg-web-brand-light/30 py-2 pl-4 text-slate-700">{children}</blockquote>,
    hr: () => <hr className="my-8 border-slate-200" />,
    table: ({ children }) => <div className="my-6 overflow-x-auto"><table className="w-full min-w-[480px] border-collapse border border-slate-200 text-sm">{children}</table></div>,
    thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
    th: ({ children }) => <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">{children}</th>,
    td: ({ children }) => <td className="border border-slate-200 px-3 py-2 text-slate-700">{children}</td>,
    code: ({ className, children }) => {
      const text = String(children)
      const isBlock = /language-/.test(className ?? "") || text.includes("\n")
      if (!isBlock) return <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-800">{children}</code>
      return <code className={className}>{children}</code>
    },
    pre: ({ children }) => <PreWithCopy>{children}</PreWithCopy>,
  }
  return (
    <div className="help-prose max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
