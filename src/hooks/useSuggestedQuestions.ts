"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { connections } from "@/lib/api"
import type { SuggestedQuestion, Connection } from "@/types"

const GENERIC_FALLBACK: SuggestedQuestion[] = [
  { question: "What is my revenue this month?", category: "metric", complexity: "simple", reason: "" },
  { question: "How many new users signed up this week?", category: "metric", complexity: "simple", reason: "" },
  { question: "Which customers are at risk of churning?", category: "entity", complexity: "medium", reason: "" },
  { question: "Show me revenue by month for the last 6 months", category: "metric", complexity: "medium", reason: "" },
  { question: "Who are my top 10 customers by value?", category: "entity", complexity: "medium", reason: "" },
  { question: "What is my current churn rate?", category: "metric", complexity: "simple", reason: "" },
  { question: "How many active subscriptions are there?", category: "metric", complexity: "simple", reason: "" },
  { question: "Show me something interesting about my data", category: "general", complexity: "medium", reason: "" },
]

export function useSuggestedQuestions(connectionId: string | null) {
  const qc = useQueryClient()
  const prevVersion = useRef<number | undefined>(undefined)

  const connQuery = useQuery<Connection>({
    queryKey: ["connection-detail", connectionId],
    queryFn: () => connections.get(connectionId!) as Promise<Connection>,
    enabled: !!connectionId,
    staleTime: 30_000,
  })

  const contextVersion = (connQuery.data as unknown as { context_version?: number })?.context_version

  useEffect(() => {
    if (contextVersion === undefined) return
    if (prevVersion.current !== undefined && prevVersion.current !== contextVersion) {
      qc.invalidateQueries({ queryKey: ["suggested-questions", connectionId] })
    }
    prevVersion.current = contextVersion
  }, [contextVersion, connectionId, qc])

  const { data, isLoading, error } = useQuery<SuggestedQuestion[]>({
    queryKey: ["suggested-questions", connectionId],
    queryFn: () => connections.suggestedQuestions(connectionId!),
    enabled: !!connectionId,
    staleTime: 60 * 60 * 1000,
  })

  const suggestions = (!data || data.length < 4) ? GENERIC_FALLBACK : data

  return { suggestions, isLoading, error }
}
