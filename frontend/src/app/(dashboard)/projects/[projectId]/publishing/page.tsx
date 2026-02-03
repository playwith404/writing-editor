"use client"

import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

export default function PublishingPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const qc = useQueryClient()

  const documentsQuery = useQuery({
    queryKey: ["documents", projectId],
    queryFn: () => api.documents.list(projectId),
  })
  const documents = useMemo(() => (documentsQuery.data ?? []) as any[], [documentsQuery.data])

  const exportsQuery = useQuery({
    queryKey: ["publishing-exports", projectId],
    queryFn: () => api.publishing.list(projectId),
  })
  const exportsList = useMemo(() => (exportsQuery.data ?? []) as any[], [exportsQuery.data])

  const [exportFormat, setExportFormat] = useState("kakaopage")
  const [documentId, setDocumentId] = useState<string>("")
  const [createError, setCreateError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: async () => {
      setCreateError(null)
      return api.publishing.create({
        projectId,
        exportFormat,
        documentId: documentId || undefined,
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["publishing-exports", projectId] })
    },
    onError: (err) => setCreateError(err instanceof ApiError ? err.message : "내보내기 생성에 실패했습니다."),
  })

  const [deliverId, setDeliverId] = useState<string | null>(null)
  const [deliverTo, setDeliverTo] = useState("")
  const [deliverSubject, setDeliverSubject] = useState("")
  const [deliverMessage, setDeliverMessage] = useState("")
  const [deliverError, setDeliverError] = useState<string | null>(null)

  const deliverMutation = useMutation({
    mutationFn: async () => {
      if (!deliverId) return null
      setDeliverError(null)
      if (!deliverTo.trim()) throw new ApiError("받는 사람 이메일(to)이 필요합니다.", 400, null)
      return api.publishing.deliver(deliverId, {
        type: "email",
        to: deliverTo.trim(),
        subject: deliverSubject.trim() || undefined,
        message: deliverMessage.trim() || undefined,
      })
    },
    onSuccess: async () => {
      setDeliverId(null)
      setDeliverTo("")
      setDeliverSubject("")
      setDeliverMessage("")
      await qc.invalidateQueries({ queryKey: ["publishing-exports", projectId] })
    },
    onError: (err) => setDeliverError(err instanceof ApiError ? err.message : "이메일 전달에 실패했습니다."),
  })

  const downloadMutation = useMutation({
    mutationFn: async (id: string) => api.publishing.download(id),
    onSuccess: (res) => {
      const url = URL.createObjectURL(res.blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.filename || "cowrite-export"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">퍼블리싱</h2>
        <p className="text-sm text-muted-foreground">플랫폼 포맷으로 변환해 파일로 내보내고, 이메일로 전달할 수 있습니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">내보내기 생성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 lg:grid-cols-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">포맷</div>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="kakaopage">카카오페이지</option>
                <option value="novelpia">노블피아(Markdown)</option>
                <option value="munpia">문피아</option>
                <option value="markdown">Markdown</option>
                <option value="txt">TXT</option>
                <option value="epub">EPUB</option>
              </select>
            </div>
            <div className="space-y-1 lg:col-span-2">
              <div className="text-xs text-muted-foreground">문서 선택(선택)</div>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
              >
                <option value="">전체 문서</option>
                {documents.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {createError && <div className="text-sm text-red-600">{createError}</div>}
          <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? "생성 중..." : "내보내기 생성"}
          </Button>
        </CardContent>
      </Card>

      {deliverId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">이메일 전달</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input value={deliverTo} onChange={(e) => setDeliverTo(e.target.value)} placeholder="받는 사람 이메일" />
            <Input value={deliverSubject} onChange={(e) => setDeliverSubject(e.target.value)} placeholder="제목(선택)" />
            <textarea
              value={deliverMessage}
              onChange={(e) => setDeliverMessage(e.target.value)}
              placeholder="메시지(선택)"
              className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            />
            {deliverError && <div className="text-sm text-red-600">{deliverError}</div>}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setDeliverId(null)} disabled={deliverMutation.isPending}>
                취소
              </Button>
              <Button onClick={() => deliverMutation.mutate()} disabled={deliverMutation.isPending}>
                {deliverMutation.isPending ? "전송 중..." : "전송"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">내보내기 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {exportsQuery.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
          {exportsQuery.isError && <div className="text-sm text-red-600">목록을 불러오지 못했습니다.</div>}
          {!exportsQuery.isLoading && exportsList.length === 0 && (
            <div className="text-sm text-muted-foreground">아직 내보내기 기록이 없습니다.</div>
          )}

          <div className="space-y-2">
            {exportsList.map((row) => (
              <div key={row.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {row.exportFormat || "포맷"} · {row.status || "queued"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {row.fileUrl || ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={row.status !== "completed" || downloadMutation.isPending}
                      onClick={() => downloadMutation.mutate(String(row.id))}
                    >
                      다운로드
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={row.status !== "completed"}
                      onClick={() => {
                        setDeliverError(null)
                        setDeliverId(String(row.id))
                      }}
                    >
                      이메일
                    </Button>
                  </div>
                </div>
                {row.metadata?.error && (
                  <>
                    <Separator className="my-2" />
                    <div className="text-sm text-red-600 whitespace-pre-wrap">{String(row.metadata.error)}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
