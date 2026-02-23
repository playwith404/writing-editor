"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { api, ApiError } from "@/lib/api"
import { setTokens } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/projects"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResendMessage(null)
    setLoading(true)
    try {
      const tokens = await api.auth.login({ email, password })
      setTokens(tokens)
      router.replace(next)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(typeof err.message === "string" ? err.message : "로그인에 실패했습니다.")
      } else {
        setError("로그인에 실패했습니다.")
      }
    } finally {
      setLoading(false)
    }
  }

  const onResend = async () => {
    if (!email) return
    setResendMessage(null)
    setResendLoading(true)
    try {
      const res = await api.auth.resendVerification({ email })
      setResendMessage(res.message || "인증 메일을 다시 발송했습니다.")
    } catch (err) {
      if (err instanceof ApiError) setResendMessage(err.message)
      else setResendMessage("인증 메일 발송에 실패했습니다.")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>로그인</CardTitle>
        <CardDescription>Gleey에 로그인하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium">이메일</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">비밀번호</label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" required />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {error?.includes("이메일 인증") && (
            <div className="space-y-2">
              <Button type="button" variant="secondary" className="w-full" onClick={onResend} disabled={resendLoading || !email}>
                {resendLoading ? "발송 중..." : "인증 메일 재발송"}
              </Button>
              {resendMessage && <div className="text-sm text-muted-foreground">{resendMessage}</div>}
            </div>
          )}

          <Button className="w-full" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>

          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-muted-foreground hover:underline">
              비밀번호를 잊으셨나요?
            </Link>
          </div>

          <div className="text-sm text-muted-foreground">
            계정이 없나요?{" "}
            <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-primary hover:underline">
              회원가입
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
