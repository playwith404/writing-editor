"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { api, ApiError } from "@/lib/api"
import { getAccessToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function BetaInviteClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const accessToken = useMemo(() => getAccessToken(), [])

  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    if (!accessToken) {
      const next = `/beta-invite?token=${encodeURIComponent(token)}`
      router.replace(`/login?next=${encodeURIComponent(next)}`)
      return
    }

    const run = async () => {
      if (!token) {
        setError("초대 토큰이 없습니다.")
        setLoading(false)
        return
      }
      try {
        const res = await api.betaSessions.inviteInfo(token)
        setSession(res.session)
      } catch (err) {
        if (err instanceof ApiError) setError(err.message)
        else setError("초대 정보를 불러올 수 없습니다.")
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [accessToken, token, router])

  const onJoin = async () => {
    if (!token) return
    setJoining(true)
    setError(null)
    try {
      const res = await api.betaSessions.join({ token })
      const sessionId = res.sessionId || res.session?.id
      if (sessionId) {
        router.replace(`/beta-session?sessionId=${encodeURIComponent(sessionId)}`)
      } else {
        router.replace("/projects")
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("참여에 실패했습니다.")
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>베타리딩 초대</CardTitle>
          <CardDescription>초대 정보를 불러오는 중입니다.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">불러오는 중...</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>베타리딩 초대</CardTitle>
        <CardDescription>초대받은 세션에 참여할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-sm text-red-600">{error}</div>}
        {session && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-sm font-medium">{session.title}</div>
            {session.description && <div className="mt-1 text-sm text-muted-foreground">{session.description}</div>}
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => router.replace("/projects")}>
            돌아가기
          </Button>
          <Button className="flex-1" onClick={onJoin} disabled={joining || !token}>
            {joining ? "참여 중..." : "세션 참여"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

