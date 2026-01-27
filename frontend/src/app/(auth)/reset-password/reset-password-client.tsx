"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"

import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function ResetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!token) {
      setError("재설정 토큰이 없습니다.")
      return
    }
    if (newPassword.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    setLoading(true)
    try {
      await api.auth.resetPassword({ token, newPassword })
      setMessage("비밀번호가 변경되었습니다. 로그인해 주세요.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("비밀번호 재설정에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>비밀번호 재설정</CardTitle>
        <CardDescription>새 비밀번호를 설정하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium">새 비밀번호</label>
            <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="6자 이상" type="password" minLength={6} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">새 비밀번호 확인</label>
            <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="다시 입력" type="password" minLength={6} required />
          </div>

          {message && <div className="text-sm text-muted-foreground">{message}</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => router.replace("/login")} className="flex-1">
              로그인
            </Button>
            <Button className="flex-1" disabled={loading}>
              {loading ? "처리 중..." : "변경하기"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

