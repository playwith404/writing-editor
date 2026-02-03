"use client"

import { useParams } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { useRef, useState } from "react"

import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function BackupPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const fileRef = useRef<HTMLInputElement | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importOk, setImportOk] = useState<string | null>(null)

  const exportMutation = useMutation({
    mutationFn: async () => api.backups.export(projectId),
    onSuccess: (res) => {
      const url = URL.createObjectURL(res.blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.filename || `cowrite-backup-${projectId}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },
  })

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      setImportError(null)
      setImportOk(null)
      return api.backups.import(file)
    },
    onSuccess: () => {
      setImportOk("백업을 불러왔습니다.")
      if (fileRef.current) fileRef.current.value = ""
    },
    onError: (err) => setImportError(err instanceof ApiError ? err.message : "백업 불러오기에 실패했습니다."),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">백업</h2>
        <p className="text-sm text-muted-foreground">
          프로젝트 데이터를 ZIP 파일로 내보내고, 동일한 파일로 복원할 수 있습니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">내보내기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
            {exportMutation.isPending ? "내보내는 중..." : "백업 파일 다운로드"}
          </Button>
          {exportMutation.isError && (
            <div className="text-sm text-red-600">백업 내보내기에 실패했습니다.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">불러오기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            className="block w-full text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              importMutation.mutate(file)
            }}
            disabled={importMutation.isPending}
          />
          {importMutation.isPending && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
          {importOk && <div className="text-sm text-green-700">{importOk}</div>}
          {importError && <div className="text-sm text-red-600">{importError}</div>}
        </CardContent>
      </Card>
    </div>
  )
}
