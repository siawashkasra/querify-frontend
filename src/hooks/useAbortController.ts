"use client"

import { useRef, useCallback } from "react"

export const useAbortController = () => {
  const abortRef = useRef<AbortController | null>(null)

  const getSignal = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    return abortRef.current.signal
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  return { getSignal, cancel }
}
