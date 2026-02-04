"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getAccessToken } from "@/lib/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    const read = () => setToken(getAccessToken())
    read()
    window.addEventListener("storage", read)
    window.addEventListener("cowrite.auth", read)
    return () => {
      window.removeEventListener("storage", read)
      window.removeEventListener("cowrite.auth", read)
    }
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
