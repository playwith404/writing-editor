"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { api, ApiError } from "@/lib/api"
import { clearTokens } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

type SessionRow = {
  id: string
  createdAt: string
  expiresAt: string
  revokedAt?: string | null
  userAgent?: string | null
  ipAddress?: string | null
}

export default function SettingsClient() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [subscription, setSubscription] = useState<any>(null)
  const [points, setPoints] = useState<number | null>(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  const [newEmail, setNewEmail] = useState("")
  const [emailMessage, setEmailMessage] = useState<string | null>(null)

  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const [deletePassword, setDeletePassword] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = async () => {
    setError(null)
    setLoading(true)
    try {
      const [me, sub, bal, sess] = await Promise.all([
        api.auth.me(),
        api.billing.subscription().catch(() => null),
        api.points.balance().catch(() => ({ balance: 0 })),
        api.auth.sessions().catch(() => []),
      ])
      setUser(me)
      setName(me?.name || "")
      setAvatarUrl(me?.avatarUrl || null)
      setSubscription(sub)
      setPoints(typeof bal?.balance === "number" ? bal.balance : 0)
      setSessions(sess as any)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("설정을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSaveProfile = async () => {
    setError(null)
    try {
      const updated = await api.auth.updateMe({ name, avatarUrl: avatarUrl || undefined })
      setUser(updated)
      setName(updated?.name || "")
      setAvatarUrl(updated?.avatarUrl || null)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("저장에 실패했습니다.")
    }
  }

  const onUploadAvatar = async (file: File) => {
    setError(null)
    try {
      const res = await api.media.upload(file)
      setAvatarUrl(res.url)
      const updated = await api.auth.updateMe({ avatarUrl: res.url })
      setUser(updated)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("업로드에 실패했습니다.")
    }
  }

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)
    setError(null)
    try {
      await api.auth.changePassword({ currentPassword, newPassword })
      setPasswordMessage("비밀번호가 변경되었습니다. 다시 로그인해 주세요.")
      clearTokens()
      router.replace("/login")
    } catch (err) {
      if (err instanceof ApiError) setPasswordMessage(err.message)
      else setPasswordMessage("비밀번호 변경에 실패했습니다.")
    }
  }

  const onRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailMessage(null)
    setError(null)
    try {
      const res = await api.auth.requestEmailChange({ newEmail })
      setEmailMessage(res.message || "이메일 변경 확인 메일을 발송했습니다. 메일함을 확인해 주세요.")
    } catch (err) {
      if (err instanceof ApiError) setEmailMessage(err.message)
      else setEmailMessage("요청에 실패했습니다.")
    }
  }

  const onReloadSessions = async () => {
    setSessionsLoading(true)
    try {
      const sess = await api.auth.sessions()
      setSessions(sess as any)
    } finally {
      setSessionsLoading(false)
    }
  }

  const onRevokeSession = async (id: string) => {
    setError(null)
    try {
      await api.auth.revokeSession(id)
      await onReloadSessions()
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("세션 해제에 실패했습니다.")
    }
  }

  const onDeleteAccount = async () => {
    setDeleteLoading(true)
    setError(null)
    try {
      await api.auth.deleteAccount({ password: deletePassword || undefined })
      clearTokens()
      router.replace("/login")
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("계정 삭제에 실패했습니다.")
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">불러오는 중...</div>
  }

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-[30px] font-bold text-gray-900">설정</h1>
        <p className="mt-2 text-[15px] text-gray-500">계정과 운영 설정을 관리하세요.</p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="text-[18px] font-semibold text-[#0f172a]">계정 정보</CardTitle>
          <CardDescription className="text-[13px] text-gray-500 mt-1">프로필과 기본 정보를 수정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">이메일: {user?.email || "-"}</div>
          <div className="text-sm text-muted-foreground">권한: {user?.role || "user"}</div>
          <div className="text-sm text-muted-foreground">
            구독: {subscription?.plan ? `${subscription.plan} (${subscription.status})` : "free"}
            {points !== null ? ` · 포인트: ${points}` : ""}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">이름</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">아바타</label>
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="avatar" className="h-12 w-12 rounded-full border object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-full border bg-muted/30" />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void onUploadAvatar(f)
                  }}
                />
              </div>
            </div>
          </div>

          <Button onClick={onSaveProfile}>저장</Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="text-[18px] font-semibold text-[#0f172a]">보안</CardTitle>
          <CardDescription className="text-[13px] text-gray-500 mt-1">비밀번호와 이메일을 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-3" onSubmit={onChangePassword}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">현재 비밀번호</label>
                <Input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">새 비밀번호</label>
                <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" minLength={6} required />
              </div>
            </div>
            {passwordMessage && <div className="text-sm text-muted-foreground">{passwordMessage}</div>}
            <Button type="submit" variant="secondary">
              비밀번호 변경
            </Button>
          </form>

          <Separator />

          <form className="space-y-3" onSubmit={onRequestEmailChange}>
            <div className="space-y-2">
              <label className="text-sm font-medium">새 이메일</label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="new@example.com" required />
            </div>
            {emailMessage && <div className="text-sm text-muted-foreground">{emailMessage}</div>}
            <Button type="submit" variant="secondary">
              이메일 변경 요청
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="text-[18px] font-semibold text-[#0f172a]">로그인 세션</CardTitle>
          <CardDescription className="text-[13px] text-gray-500 mt-1">현재 계정의 로그인 세션을 확인하고 해제할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onReloadSessions} disabled={sessionsLoading}>
              {sessionsLoading ? "새로고침 중..." : "새로고침"}
            </Button>
          </div>
          {sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground">세션 정보가 없습니다.</div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">
                  생성: {new Date(s.createdAt).toLocaleString()} · 만료: {new Date(s.expiresAt).toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  IP: {s.ipAddress || "-"} · {s.userAgent || "-"}
                </div>
                <div className="mt-2 flex justify-end">
                  <Button variant="secondary" onClick={() => onRevokeSession(s.id)} disabled={Boolean(s.revokedAt)}>
                    {s.revokedAt ? "해제됨" : "세션 해제"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-red-200 bg-white shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="text-[18px] font-semibold text-red-600">계정 삭제</CardTitle>
          <CardDescription className="text-[13px] text-red-500 mt-1">계정을 삭제하면 로그인할 수 없습니다. (데이터는 복구할 수 없습니다)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">비밀번호(로컬 계정만)</label>
            <Input value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} type="password" placeholder="비밀번호" />
          </div>
          <Button variant="destructive" onClick={onDeleteAccount} disabled={deleteLoading}>
            {deleteLoading ? "삭제 중..." : "계정 삭제"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

