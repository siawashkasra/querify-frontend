"use client"

// LegacyAnswer — sole renderer for pre-v2 messages (no answer_document).
// ChatCanvas delegates here for any assistant message where msg.document is absent.
// Delete this file once all messages in prod have been answered with v2.

import ResultCard from "@/components/chat/ResultCard"
import ErrorCard from "@/components/chat/ErrorCard"
import type { ThreadMessage } from "@/store/chatStore"

interface Props {
  msg: ThreadMessage
  prevPrompt?: string
  connectionName?: string
  onFollowUp?: (q: string) => void
  onRetry?: (prompt: string) => void
}

export function LegacyAnswer({ msg, prevPrompt, connectionName, onFollowUp, onRetry }: Props) {
  if (msg.error || msg.errorType) {
    return (
      <ErrorCard
        errorType={msg.errorType}
        errorDetail={msg.errorDetail}
        onRetry={
          msg.retryPrompt && onFollowUp
            ? () => onFollowUp(msg.retryPrompt!)
            : onRetry && prevPrompt
            ? () => onRetry(prevPrompt)
            : undefined
        }
        retryLabel={msg.retryPrompt ? "Run on last 30 days" : undefined}
        onRephrase={onFollowUp ? () => onFollowUp("") : undefined}
      />
    )
  }

  if (msg.result) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-line dark:border-gray-800 rounded-2xl shadow-rest px-6 py-5">
        <ResultCard
          result={msg.result}
          prompt={prevPrompt}
          connectionName={connectionName}
          onFollowUp={onFollowUp ? () => onFollowUp("") : undefined}
        />
      </div>
    )
  }

  return null
}
