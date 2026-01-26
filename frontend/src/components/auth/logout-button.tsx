"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { clearTokens } from "@/lib/auth"

export function LogoutButton() {
  const router = useRouter()

  const onLogout = async () => {
    try {
      await api.auth.logout()
    } catch {
      // ignore
    } finally {
      clearTokens()
      router.replace("/login")
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={onLogout} className="w-full justify-start">
      <LogOut className="mr-2 h-4 w-4" />
      로그아웃
    </Button>
  )
}

