"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { api, ApiError } from "@/lib/api"
import { getAccessToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type FeedbackForm = {
  rating?: number
  immersionRating?: number
  pacingRating?: number
  characterRating?: number
  isAnonymous?: boolean
  comment?: string
}

function toInt(value: string): number | undefined {
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  const i = Math.trunc(n)
  if (i < 1 || i > 5) return undefined
  return i
}

export default function BetaSessionClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId") || ""
  const accessToken = useMemo(() => getAccessToken(), [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  const [doc, setDoc] = useState<any>(null)
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FeedbackForm>({ isAnonymous: true })
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const load = async () => {
    if (!sessionId) {
      setError("sessionId가 없습니다.")
      setLoading(false)
      return
    }
    try {
      const [s, d, f] = await Promise.all([api.betaSessions.get(sessionId), api.betaSessions.document(sessionId), api.betaFeedback.list(sessionId)])
      setSession(s)
      setDoc(d)
      setFeedbacks(f)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("세션 정보를 불러올 수 없습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken) {
      router.replace(`/login?next=${encodeURIComponent(`/beta-session?sessionId=${encodeURIComponent(sessionId)}`)}`)
      return
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, sessionId, router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    if (!sessionId) return

    setSubmitting(true)
    try {
      await api.betaFeedback.create({ sessionId, ...form })
      setSuccessMessage("피드백이 등록되었습니다.")
      const f = await api.betaFeedback.list(sessionId)
      setFeedbacks(f)
      setForm({ isAnonymous: true })
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("피드백 등록에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>베타리딩</CardTitle>
          <CardDescription>세션을 불러오는 중입니다.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">불러오는 중...</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{session?.title || "베타리딩 세션"}</CardTitle>
          <CardDescription>{session?.description || "문서를 확인하고 피드백을 남겨주세요."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {doc && (
            <div className="rounded-md border p-3">
              <div className="text-sm font-medium">{doc.title}</div>
              <div
                className="prose prose-sm mt-2 max-w-none"
                dangerouslySetInnerHTML={{ __html: String(doc.content || "") }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>피드백 작성</CardTitle>
          <CardDescription>간단한 평가와 코멘트를 남겨주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">총점(1~5)</label>
                <Input value={form.rating ?? ""} onChange={(e) => setForm((p) => ({ ...p, rating: toInt(e.target.value) }))} placeholder="선택" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">몰입도(1~5)</label>
                <Input value={form.immersionRating ?? ""} onChange={(e) => setForm((p) => ({ ...p, immersionRating: toInt(e.target.value) }))} placeholder="선택" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">페이싱(1~5)</label>
                <Input value={form.pacingRating ?? ""} onChange={(e) => setForm((p) => ({ ...p, pacingRating: toInt(e.target.value) }))} placeholder="선택" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">캐릭터(1~5)</label>
                <Input value={form.characterRating ?? ""} onChange={(e) => setForm((p) => ({ ...p, characterRating: toInt(e.target.value) }))} placeholder="선택" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="anonymous"
                type="checkbox"
                checked={Boolean(form.isAnonymous)}
                onChange={(e) => setForm((p) => ({ ...p, isAnonymous: e.target.checked }))}
              />
              <label htmlFor="anonymous" className="text-sm text-muted-foreground">
                익명으로 제출
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">코멘트</label>
              <textarea
                className="w-full rounded-md border bg-background p-2 text-sm"
                rows={4}
                value={form.comment ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
                placeholder="자유롭게 의견을 남겨주세요."
              />
            </div>

            {successMessage && <div className="text-sm text-muted-foreground">{successMessage}</div>}

            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => router.replace("/projects")}>
                프로젝트로
              </Button>
              <Button className="flex-1" disabled={submitting}>
                {submitting ? "등록 중..." : "피드백 등록"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>내 피드백</CardTitle>
          <CardDescription>등록한 피드백을 확인할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {feedbacks.length === 0 ? (
            <div className="text-sm text-muted-foreground">아직 등록된 피드백이 없습니다.</div>
          ) : (
            feedbacks.map((f) => (
              <div key={f.id} className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleString()}</div>
                <div className="mt-1 text-sm">
                  {f.comment || "코멘트 없음"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

