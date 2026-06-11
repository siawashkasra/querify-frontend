"use client"

// useSessionTitle — E11: returns the live session title for a sessionId.
// Priority: v2 live title from store (session_title SSE event) > server title > fallback.

import { useChatStore } from "@/store/chatStore"

export function useSessionTitle(sessionId: string, serverTitle?: string | null): string {
  const liveTitle = useChatStore((s) => s.sessionTitles[sessionId])
  return liveTitle ?? serverTitle ?? "Untitled"
}
