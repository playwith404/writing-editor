"use client"

import { useState } from "react"

import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const res = await api.auth.requestPasswordReset({ email })
      setMessage(res.message || "비밀번호 재설정 링크를 발송했습니다. 메일함을 확인해 주세요.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("요청에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>비밀번호 찾기</CardTitle>
        <CardDescription>가입한 이메일로 비밀번호 재설정 링크를 보내드립니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium">이메일</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" required />
          </div>

          {message && <div className="text-sm text-muted-foreground">{message}</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}

          <Button className="w-full" disabled={loading}>
            {loading ? "전송 중..." : "재설정 링크 전송"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

