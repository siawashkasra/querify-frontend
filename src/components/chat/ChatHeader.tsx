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
    <div className="flex items-center justify-between h-11 px-4 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false) }}
              className="text-sm font-medium bg-transparent border-b border-brand outline-none text-[var(--text)] w-48"
            />
            <button onClick={commitEdit} className="text-success"><Check size={13} /></button>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 group text-sm font-medium text-[var(--text)] hover:text-brand transition-colors min-w-0"
          >
            <span className="truncate">{sessionTitle ?? "New chat"}</span>
            <Pencil size={11} className="opacity-0 group-hover:opacity-60 shrink-0 transition-opacity" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {activeConn && (
          <>
            <span className={cn(
              "h-2 w-2 rounded-full shrink-0",
              activeConn.status === "active" ? "bg-success" : activeConn.status === "error" ? "bg-danger" : "bg-[var(--text-muted)]"
            )} />
            <span className="text-xs text-[var(--text-dim)] hidden sm:block">{activeConn.name}</span>
            <Badge variant="default">{activeConn.db_type}</Badge>
          </>
        )}
        <button
          onClick={toggleRightPanel}
          className={cn(
            "hidden md:flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors",
            showRightPanel
              ? "bg-[var(--surface-3)] text-[var(--text-dim)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-[var(--surface-3)]"
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
