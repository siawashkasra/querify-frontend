"use client"

import { useMemo } from "react"

const GREETINGS = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
}

export const useGreeting = () => useMemo(() => {
  const h = new Date().getHours()
  if (h < 12) return GREETINGS.morning
  if (h < 18) return GREETINGS.afternoon
  return GREETINGS.evening
}, [])
