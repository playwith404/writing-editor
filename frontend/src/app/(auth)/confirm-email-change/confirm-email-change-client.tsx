"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { api, ApiError } from "@/lib/api"
import { setTokens } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ConfirmEmailChangeClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const next = searchParams.get("next") || "/projects"

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState<string>("이메일 변경을 확인하는 중...")

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("error")
        setMessage("확인 토큰이 없습니다.")
        return
      }

      try {
        const tokens = await api.auth.confirmEmailChange({ token })
        setTokens(tokens)
        setStatus("success")
        setMessage("이메일 변경이 완료되었습니다. 잠시 후 이동합니다...")
        setTimeout(() => router.replace(next), 800)
      } catch (err) {
        setStatus("error")
        if (err instanceof ApiError) setMessage(err.message)
        else setMessage("이메일 변경에 실패했습니다.")
      }
    }

    void run()
  }, [token, router, next])

  return (
    <Card>
      <CardHeader>
        <CardTitle>이메일 변경</CardTitle>
        <CardDescription>이메일 변경을 완료하는 중입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={status === "error" ? "text-sm text-red-600" : "text-sm text-muted-foreground"}>{message}</div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.replace("/login")}>
            로그인
          </Button>
          <Button onClick={() => router.replace(next)} disabled={status !== "success"}>
            계속하기
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

