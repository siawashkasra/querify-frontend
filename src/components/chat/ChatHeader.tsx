"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, Pencil, PanelRight } from "lucide-react"
import { connections } from "@/lib/api"
import { useAppStore } from "@/store/appStore"
import Badge from "@/components/ui/Badge"
import { cn } from "@/lib/cn"
import type { Connection } from "@/types"

interface ChatHeaderProps {
  sessionTitle: string | null
  onTitleChange?: (title: string) => void
}

export const ChatHeader = ({ sessionTitle, onTitleChange }: ChatHeaderProps) => {
  const { activeConnectionId, showRightPanel, toggleRightPanel } = useAppStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const { data: allConnections } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connections.list() as Promise<Connection[]>,
    staleTime: 30_000,
  })

  const activeConn = allConnections?.find((c) => c.id === activeConnectionId) ?? allConnections?.[0] ?? null

  const startEdit = () => { setDraft(sessionTitle ?? ""); setEditing(true) }
  const commitEdit = () => {
    if (draft.trim() && onTitleChange) onTitleChange(draft.trim())
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between h-14 px-4 border-b border-line bg-surface shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false) }}
              className="font-display text-[15px] font-semibold bg-transparent border-b border-violet outline-none text-ink w-48"
            />
            <button onClick={commitEdit} className="text-verify" aria-label="Save title"><Check size={13} /></button>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 group font-display text-[15px] font-semibold text-ink hover:text-violet transition-colors min-w-0"
          >
            <span className="truncate">{sessionTitle ?? "New chat"}</span>
            <Pencil size={11} className="opacity-0 group-hover:opacity-60 shrink-0 transition-opacity" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {activeConn && (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-dim bg-paper rounded-pill px-2.5 py-1">
            <span className={cn(
              "h-2 w-2 rounded-full shrink-0",
              activeConn.status === "active" ? "bg-verify" : activeConn.status === "error" ? "bg-alert" : "bg-ink-dim"
            )} />
            <span className="hidden sm:block">{activeConn.name}</span>
            <Badge variant="neutral">{activeConn.db_type}</Badge>
          </span>
        )}
        <button
          onClick={toggleRightPanel}
          className={cn(
            "hidden md:flex items-center gap-1 px-2 py-1 rounded-ctrl text-xs transition-colors",
            showRightPanel
              ? "bg-violet-soft text-violet"
              : "text-ink-dim hover:text-ink hover:bg-paper"
          )}
          title={showRightPanel ? "Hide analysis panel" : "Show analysis panel"}
        >
          <PanelRight size={13} />
          <span className="hidden lg:block">Analysis</span>
        </button>
      </div>
    </div>
  )
}

export default ChatHeader
