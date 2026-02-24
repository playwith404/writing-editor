"use client"

import { useParams } from "next/navigation"
import { useRef, useState } from "react"
import { Download, FileArchive, UploadCloud } from "lucide-react"

type BackupHistory = {
  id: string
  name: string
  sizeLabel: string
  createdAt: string
}

export default function BackupPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const fileRef = useRef<HTMLInputElement | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [history, setHistory] = useState<BackupHistory[]>([
    {
      id: "backup-1",
      name: `${projectId}-backup-2026-02-23.json`,
      sizeLabel: "12 KB",
      createdAt: "2026-02-23 09:41",
    },
  ])

  const exportBackup = () => {
    const now = new Date()
    const timestamp = now.toISOString()
    const filename = `${projectId}-backup-${timestamp.slice(0, 10)}.json`

    const payload = {
      projectId,
      exportedAt: timestamp,
      note: "Frontend-only mock backup file",
      sections: {
        worldBuilding: 4,
        relationships: 3,
        characters: 2,
        timelineScenes: 6,
      },
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    setHistory((prev) => [
      {
        id: `backup-${prev.length + 1}`,
        name: filename,
        sizeLabel: `${Math.max(1, Math.round(blob.size / 1024))} KB`,
        createdAt: now.toLocaleString(),
      },
      ...prev,
    ])
  }

  const importBackup = async (file: File) => {
    setImportMessage(null)
    setImportError(null)

    if (!file.name.endsWith(".json")) {
      setImportError("JSON 백업 파일만 업로드할 수 있습니다.")
      return
    }

    try {
      const text = await file.text()
      JSON.parse(text)
      setImportMessage(`백업 파일을 불러왔습니다: ${file.name}`)

      setHistory((prev) => [
        {
          id: `backup-${prev.length + 1}`,
          name: file.name,
          sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
          createdAt: new Date().toLocaleString(),
        },
        ...prev,
      ])
    } catch {
      setImportError("유효한 JSON 백업 파일이 아닙니다.")
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[32px] font-bold text-[#111827]">백업</h1>
        <p className="mt-2 text-lg text-[#7d6f62]">
          현재 화면은 프론트 UI 테스트용 백업 시뮬레이션입니다. 실제 서버 저장 없이 로컬 파일로만 동작합니다.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#d9e2ee] bg-white p-6 shadow-sm">
          <div className="mb-4 inline-flex rounded-xl bg-[#f3eee7] p-3 text-[#8a7b6c]">
            <Download className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-[#1f2937]">백업 내보내기</h2>
          <p className="mt-2 text-sm leading-6 text-[#7d6f62]">
            프로젝트 상태를 JSON 파일로 다운로드합니다. 화면 검증용으로 즉시 내보내기 가능합니다.
          </p>
          <button
            type="button"
            onClick={exportBackup}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#938274] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#7f6f60]"
          >
            <Download className="h-4 w-4" />
            백업 파일 다운로드
          </button>
        </div>

        <div className="rounded-2xl border border-[#d9e2ee] bg-white p-6 shadow-sm">
          <div className="mb-4 inline-flex rounded-xl bg-[#f3eee7] p-3 text-[#8a7b6c]">
            <UploadCloud className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-[#1f2937]">백업 불러오기</h2>
          <p className="mt-2 text-sm leading-6 text-[#7d6f62]">
            JSON 백업 파일을 업로드해 복원 시뮬레이션을 진행합니다.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="mt-4 block w-full rounded-xl border border-[#d9e2ee] px-3 py-2 text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              void importBackup(file)
            }}
          />
          {importMessage && <p className="mt-3 text-sm text-green-700">{importMessage}</p>}
          {importError && <p className="mt-3 text-sm text-red-600">{importError}</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-[#d9e2ee] bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wide text-[#1f2937]">
          <FileArchive className="h-4 w-4 text-[#8a7b6c]" />
          BACKUP HISTORY
        </h3>

        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e4dbd1] bg-[#fdfbf7] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#1f2937]">{item.name}</p>
                <p className="text-xs text-[#7d6f62]">{item.createdAt}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#7d6f62]">{item.sizeLabel}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
