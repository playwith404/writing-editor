"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { api, ApiError } from "@/lib/api"
import { setTokens } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function OauthGoogleCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const code = searchParams.get("code") || ""

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("구글 로그인 처리 중...")

  useEffect(() => {
    const run = async () => {
      if (!code) {
        setStatus("error")
        setMessage("구글 로그인 코드가 없습니다.")
        return
      }
      try {
        const res = await api.auth.oauthExchange({ code })
        setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken })
        setStatus("success")
        setMessage("로그인이 완료되었습니다. 잠시 후 이동합니다...")
        setTimeout(() => router.replace(res.next || "/projects"), 500)
      } catch (err) {
        setStatus("error")
        if (err instanceof ApiError) setMessage(err.message)
        else setMessage("구글 로그인 처리에 실패했습니다.")
      }
    }
    void run()
  }, [code, router])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google 로그인</CardTitle>
        <CardDescription>인증 결과를 처리하고 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={status === "error" ? "text-sm text-red-600" : "text-sm text-muted-foreground"}>{message}</div>
        <Button onClick={() => router.replace("/login")} variant="secondary">
          로그인으로 이동
        </Button>
      </CardContent>
    </Card>
  )
}
