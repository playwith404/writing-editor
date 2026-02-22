"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { api, ApiError } from "@/lib/api"
import { setTokens } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function RegisterClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/projects"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.auth.register({ email, name, password })
      if ("accessToken" in res && "refreshToken" in res) {
        setTokens(res)
        router.replace(next)
        return
      }
      setSent(true)
      setSentMessage(res.message || "인증 메일을 발송했습니다. 메일함을 확인해 주세요.")
    } catch (err) {
      if (err instanceof ApiError) {
        setError(typeof err.message === "string" ? err.message : "회원가입에 실패했습니다.")
      } else {
        setError("회원가입에 실패했습니다.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>회원가입</CardTitle>
        <CardDescription>새 계정을 만들고 Gleey를 시작하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              {sentMessage}
              <div className="mt-2 text-xs text-muted-foreground">
                메일의 링크를 클릭하면 인증이 완료됩니다.
              </div>
            </div>
            <Button className="w-full" onClick={() => router.replace(`/login?next=${encodeURIComponent(next)}`)}>
              로그인으로 이동
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">이름</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">이메일</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">비밀번호</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상" type="password" minLength={6} required />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <Button className="w-full" disabled={loading}>
              {loading ? "가입 중..." : "회원가입"}
            </Button>

            <div className="text-sm text-muted-foreground">
              이미 계정이 있나요?{" "}
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-primary hover:underline">
                로그인
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
