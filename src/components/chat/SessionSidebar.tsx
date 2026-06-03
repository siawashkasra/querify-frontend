"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { query as queryApi } from "@/lib/api"
import { useAppStore } from "@/store/appStore"
import { cn } from "@/lib/cn"
import type { ChatSession } from "@/types"

export const SessionSidebar = () => {
  const params = useParams()
  const activeSessionId = params?.sessionId as string | undefined
  const { activeConnectionId } = useAppStore()

  const { data: sessions } = useQuery<ChatSession[]>({
    queryKey: ["sessions", activeConnectionId],
    queryFn: () => queryApi.sessions(activeConnectionId ?? undefined) as Promise<ChatSession[]>,
    staleTime: 30_000,
  })

  return (
    <aside className="w-[220px] shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="p-3 border-b border-[var(--border)]">
        <Link
          href="/chat/new"
          className="flex items-center justify-center gap-2 w-full h-8 rounded text-xs font-medium bg-brand text-white hover:bg-brand-dark transition-colors"
        >
          <Plus size={13} />
          New chat
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {!sessions?.length && (
          <p className="text-xs text-[var(--text-muted)] text-center py-8 px-3">No chats yet</p>
        )}
        {sessions?.map((s) => (
          <Link
            key={s.id}
            href={`/chat/${s.id}`}
            className={cn(
              "flex flex-col gap-0.5 px-3 py-2.5 text-xs transition-colors hover:bg-[var(--surface-2)]",
              activeSessionId === s.id && "bg-[var(--brand-light)] border-r-2 border-brand"
            )}
          >
            <span className={cn(
              "font-medium truncate leading-tight",
              activeSessionId === s.id ? "text-brand" : "text-[var(--text)]"
            )}>
              {(s.title ?? "Untitled chat").slice(0, 40)}
            </span>
            <span className="text-[var(--text-muted)]">
              {formatDistanceToNow(new Date(s.last_active_at), { addSuffix: true })}
            </span>
          </Link>
        ))}
      </div>
    </aside>
  )
}

export default SessionSidebar
