"use client"

import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

export const NetworkBanner = () => {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        await fetch("/api/health", { method: "HEAD", cache: "no-store" })
        if (mounted) setOffline(false)
      } catch {
        if (mounted) setOffline(true)
      }
    }

    check()
    const interval = setInterval(check, 10_000)
    const handleOffline = () => setOffline(true)
    const handleOnline = () => { setOffline(false); check() }
    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
    return () => {
      mounted = false
      clearInterval(interval)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-warning/90 backdrop-blur-sm text-white text-xs font-medium py-2 px-4 shadow-rest">
      <WifiOff size={13} className="shrink-0" />
      Cannot connect to Querify. Check your internet connection.
    </div>
  )
}

export default NetworkBanner
