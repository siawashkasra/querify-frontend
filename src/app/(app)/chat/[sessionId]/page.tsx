export default function ChatSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-[var(--text-dim)] text-sm">Chat — built in C5</p>
    </div>
  )
}
