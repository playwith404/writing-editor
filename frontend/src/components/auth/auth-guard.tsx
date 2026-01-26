"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getAccessToken } from "@/lib/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  const token = useMemo(() => getAccessToken(), [])

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/projects")}`)
    }
  }, [ready, token, router, pathname])

  if (!ready) return null
  if (!token) return null
  return <>{children}</>
}

