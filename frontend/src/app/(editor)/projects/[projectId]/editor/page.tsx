"use client"
/* eslint-disable react-hooks/set-state-in-effect */

import clsx from "clsx"
import type { Editor } from "@tiptap/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Bold,
  Download,
  Globe,
  Heading1,
  Heading2,
  Italic,
  Quote,
  Search,
  Sparkles,
  Users,
} from "lucide-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import Sidebar from "@/components/dashboard/Sidebar"
import { TipTapEditor } from "@/components/editor/tiptap-editor"
import { api, ApiError } from "@/lib/api"

type ToolbarState = {
  bold: boolean
  italic: boolean
  heading1: boolean
  heading2: boolean
  blockquote: boolean
}

const DEFAULT_TOOLBAR_STATE: ToolbarState = {
  bold: false,
  italic: false,
  heading1: false,
  heading2: false,
  blockquote: false,
}

function stripHtml(value: string) {
  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function ToolbarButton({
  active = false,
  disabled = false,
  onClick,
  title,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-[#5f5347] transition",
        active ? "border-[#9f8b75] bg-[#efe5d7]" : "border-transparent hover:border-[#dfd3c3] hover:bg-[#f5efe6]",
        disabled && "cursor-not-allowed text-[#b8a99a] hover:border-transparent hover:bg-transparent"
      )}
    >
      {children}
    </button>
  )
}

export default function WriterModeEditorPage() {
  const params = useParams<{ projectId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()

  const editorRef = useRef<Editor | null>(null)
  const bootstrappingRef = useRef(false)

  const projectId = params.projectId
  const episodeId = searchParams.get("episodeId") || ""

  const [content, setContent] = useState("")
  const [dirty, setDirty] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [toolbarState, setToolbarState] = useState<ToolbarState>(DEFAULT_TOOLBAR_STATE)

  const projectQuery = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.projects.get(projectId),
    enabled: Boolean(projectId),
  })

  const episodesQuery = useQuery({
    queryKey: ["episodes", projectId],
    queryFn: () => api.episodes.list(projectId),
    enabled: Boolean(projectId),
  })

  const episodes = useMemo(() => {
    const list = (episodesQuery.data ?? []) as Array<{ id: string; title: string; orderIndex: number }>
    return [...list].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
  }, [episodesQuery.data])

  const bootstrapEpisodeMutation = useMutation({
    mutationFn: async () => {
      const nextOrderIndex = episodes.length > 0 ? Math.max(...episodes.map((ep) => ep.orderIndex)) + 1 : 1
      const title = `${nextOrderIndex}장. 새 원고`
      return api.episodes.create(projectId, { title, orderIndex: nextOrderIndex })
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["episodes", projectId] })
      router.replace(`/projects/${projectId}/editor?episodeId=${encodeURIComponent(created.id)}`)
    },
    onError: (err) => {
      setSaveError(err instanceof ApiError ? err.message : "회차를 생성하지 못했습니다.")
      bootstrappingRef.current = false
    },
  })

  useEffect(() => {
    if (!projectId) return
    if (episodesQuery.isLoading || episodesQuery.isError) return
    if (episodeId) return

    if (episodes.length > 0) {
      router.replace(`/projects/${projectId}/editor?episodeId=${encodeURIComponent(episodes[0].id)}`)
      return
    }

    if (bootstrappingRef.current) return
    bootstrappingRef.current = true
    bootstrapEpisodeMutation.mutate()
  }, [projectId, episodesQuery.isLoading, episodesQuery.isError, episodeId, episodes, router, bootstrapEpisodeMutation])

  const episodeQuery = useQuery({
    queryKey: ["episode", episodeId],
    queryFn: () => api.episodes.get(episodeId),
    enabled: Boolean(episodeId),
  })

  const displayTitle = useMemo(() => {
    return episodeQuery.data?.title || "새 문서"
  }, [episodeQuery.data?.title])

  useEffect(() => {
    if (!episodeQuery.data) return
    const raw = episodeQuery.data.content
    const stored = typeof raw === "string" ? raw : ""
    const next =
      stored.trim().length > 0
        ? stored
        : `<h1>${episodeQuery.data.title || "새 문서"}</h1><p>이곳에서 문서를 작성해 보세요.</p>`
    setContent(next)
    setDirty(false)
    setSaveError(null)
  }, [episodeQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (payload: { episodeId: string; html: string }) => {
      const plain = stripHtml(payload.html)
      const charCount = plain.length
      const charCountNoSpace = plain.replace(/\s/g, "").length

      return api.episodes.save(payload.episodeId, {
        content: payload.html,
        charCount,
        charCountNoSpace,
      })
    },
    onSuccess: async (resp) => {
      setDirty(false)
      setSaveError(null)
      setLastSavedAt(resp.updatedAt ? new Date(resp.updatedAt) : new Date())
      await queryClient.invalidateQueries({ queryKey: ["episodes", projectId] })
      await queryClient.invalidateQueries({ queryKey: ["episode", episodeId] })
    },
    onError: (error) => {
      setSaveError(error instanceof ApiError ? error.message : "저장에 실패했습니다.")
    },
  })

  useEffect(() => {
    if (!dirty || !episodeId) return
    const timer = setTimeout(() => {
      saveMutation.mutate({ episodeId, html: content })
    }, 1000)
    return () => clearTimeout(timer)
  }, [dirty, episodeId, content, saveMutation])

  const wordCount = useMemo(() => {
    const plain = stripHtml(content)
    if (!plain) return 0
    return plain.split(" ").filter(Boolean).length
  }, [content])

  const formattedWordCount = useMemo(() => `${new Intl.NumberFormat("en-US").format(wordCount)} WORDS`, [wordCount])

  const worldviewsQuery = useQuery({
    queryKey: ["worldviews", projectId, "synced"],
    queryFn: () => api.worldviews.list(projectId, { isSynced: true }),
    enabled: Boolean(projectId),
  })

  const termWorldview = useMemo(() => {
    const list = worldviewsQuery.data ?? []
    return list.find((w) => w.type === "TERM") ?? null
  }, [worldviewsQuery.data])

  const bootstrapTermWorldview = useMutation({
    mutationFn: async () => {
      return api.worldviews.create(projectId, {
        name: "용어",
        description: "세계관 핵심 용어를 정리합니다.",
        type: "TERM",
        isSynced: true,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["worldviews", projectId, "synced"] })
    },
  })

  useEffect(() => {
    if (!projectId) return
    if (worldviewsQuery.isLoading || worldviewsQuery.isError) return
    if (termWorldview) return
    if (bootstrapTermWorldview.isPending) return
    bootstrapTermWorldview.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, worldviewsQuery.isLoading, worldviewsQuery.isError, termWorldview])

  const termsQuery = useQuery({
    queryKey: ["worldview-terms", termWorldview?.id],
    queryFn: () => api.worldviews.terms.list(termWorldview!.id),
    enabled: Boolean(termWorldview?.id),
  })

  const worldCards = useMemo(() => {
    const terms = termsQuery.data ?? []
    if (terms.length > 0) {
      return terms.slice(0, 2).map((item, index) => ({
        id: item.id,
        title: item.term || "제목 없음",
        description: item.meaning?.slice(0, 58) || "설명을 입력해 보세요.",
        tone: index === 0 ? "warm" : "plain",
      }))
    }

    return [
      { id: "term-1", title: "밥 쥐", description: "밥을 달라는 뜻이에요.", tone: "warm" as const },
      { id: "term-2", title: "맘마 쥐", description: "배고플 때 쓰는 신호예요.", tone: "plain" as const },
    ]
  }, [termsQuery.data])

  const charactersQuery = useQuery({
    queryKey: ["characters", projectId],
    queryFn: () => api.characters.list(projectId),
    enabled: Boolean(projectId),
  })

  const relationCards = useMemo(() => {
    const characters = charactersQuery.data ?? []
    if (characters.length > 0) {
      return characters.slice(0, 4).map((item, index) => ({
        id: item.id,
        name: item.name || "이름 없음",
        role: item.role || (index === 0 ? "주인공" : "조연"),
      }))
    }

    return [
      { id: "character-1", name: "마길초", role: "주인공" },
      { id: "character-2", name: "강은서", role: "라이벌" },
      { id: "character-3", name: "송은재", role: "히로인" },
    ]
  }, [charactersQuery.data])

  const runCommand = (command: (editor: Editor) => void) => {
    if (!editorRef.current) return
    command(editorRef.current)
    setToolbarState({
      bold: editorRef.current.isActive("bold"),
      italic: editorRef.current.isActive("italic"),
      heading1: editorRef.current.isActive("heading", { level: 1 }),
      heading2: editorRef.current.isActive("heading", { level: 2 }),
      blockquote: editorRef.current.isActive("blockquote"),
    })
  }

  const syncToolbarState = (editor: Editor | null) => {
    if (!editor) {
      setToolbarState(DEFAULT_TOOLBAR_STATE)
      return
    }

    setToolbarState({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      heading1: editor.isActive("heading", { level: 1 }),
      heading2: editor.isActive("heading", { level: 2 }),
      blockquote: editor.isActive("blockquote"),
    })
  }

  const exportDocument = () => {
    const blob = new Blob([content], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${displayTitle || "document"}.html`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#fdfbf7] text-[#4a3f34]">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-[86px] shrink-0 items-center justify-between border-b border-[#e5dacb] bg-[#f8f3ea] px-8 lg:px-10">
          <div className="flex items-center gap-1 rounded-2xl border border-[#e0d4c4] bg-[#fdfaf5] p-1 shadow-[0_2px_6px_-4px_rgba(90,66,42,0.35)]">
            <ToolbarButton
              title="굵게"
              active={toolbarState.bold}
              onClick={() => runCommand((editor) => editor.chain().focus().toggleBold().run())}
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="밑줄 (준비중)" disabled>
              <span className="text-xs font-semibold">U</span>
            </ToolbarButton>
            <ToolbarButton
              title="기울임"
              active={toolbarState.italic}
              onClick={() => runCommand((editor) => editor.chain().focus().toggleItalic().run())}
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="H1"
              active={toolbarState.heading1}
              onClick={() =>
                runCommand((editor) =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                )
              }
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="H2"
              active={toolbarState.heading2}
              onClick={() =>
                runCommand((editor) =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                )
              }
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="인용문"
              active={toolbarState.blockquote}
              onClick={() => runCommand((editor) => editor.chain().focus().toggleBlockquote().run())}
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-4">
            <span className="rounded-full bg-[#fdfaf5] px-4 py-2 text-xs font-bold text-[#7e6f5f] shadow-sm">
              {formattedWordCount}
            </span>
            <button
              type="button"
              onClick={exportDocument}
              className="inline-flex items-center gap-2 rounded-full border border-[#e0d4c4] bg-[#fdfaf5] px-4 py-2 text-xs font-bold text-[#5f5347] shadow-sm transition hover:bg-white"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto bg-[#f5f0e6] px-6 py-8 lg:px-10 lg:py-10">
            {saveError && (
              <div className="mx-auto mb-6 max-w-[760px] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {saveError}
              </div>
            )}

            <TipTapEditor
              content={content}
              onChange={(next) => {
                setContent(next)
                setDirty(true)
                setSaveError(null)
                syncToolbarState(editorRef.current)
              }}
              onReady={(editor) => {
                editorRef.current = editor
                syncToolbarState(editor)
                editor.on("selectionUpdate", () => syncToolbarState(editor))
                editor.on("transaction", () => syncToolbarState(editor))
              }}
              containerClassName="max-w-[760px] rounded-none border-[#e6dccf] bg-white shadow-[0_22px_60px_-42px_rgba(91,66,39,0.55)]"
              editorClassName="min-h-[82vh] px-12 py-14 text-[18px] leading-9 lg:px-16"
            />
          </main>

          <aside className="hidden w-[340px] shrink-0 border-l border-[#e5dacb] bg-[#f7f2e9] xl:flex xl:flex-col">
            <div className="border-b border-[#e5dacb] px-6 pb-5 pt-7">
              <div className="flex items-center gap-2 text-[#243447]">
                <BookOpenTextIcon />
                <h2 className="text-[30px] font-bold leading-none">Creative Zone</h2>
              </div>
              <p className="mt-2 text-sm text-[#8c7d6f]">글을 풍부하게 구성해 볼까요? :)</p>

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-2xl border border-[#d9cbb8] bg-[#fefaf3] px-4 py-2 text-sm font-semibold text-[#7e6f5f] transition hover:bg-[#f7efe2]"
                >
                  캐릭터
                </button>
                <button type="button" className="rounded-2xl border border-[#9b8a78] bg-white px-4 py-2 text-sm font-semibold text-[#5d5042] shadow-sm">
                  세계관
                </button>
                <button
                  type="button"
                  className="rounded-2xl border border-[#d9cbb8] bg-[#fefaf3] px-4 py-2 text-sm font-semibold text-[#7e6f5f] transition hover:bg-[#f7efe2]"
                >
                  AI
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <section>
                <h3 className="mb-2 text-lg font-bold text-[#67829a]">세계관</h3>
                <div className="rounded-2xl border border-[#e2d7c8] bg-[#fcf8f1] p-4">
                  <div className="mb-3 text-xs font-bold tracking-wide text-[#8f7b67]">주요 용어</div>
                  <div className="space-y-2">
                    {worldCards.map((item) => (
                      <div
                        key={item.id}
                        className={clsx(
                          "rounded-xl border p-3",
                          item.tone === "warm" ? "border-[#e8d8bf] bg-[#f8efd9]" : "border-[#e5ddd0] bg-[#f3f1eb]"
                        )}
                      >
                        <div className="text-sm font-semibold text-[#5e5348]">{item.title}</div>
                        <p className="mt-1 text-xs text-[#86786b]">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-lg font-bold text-[#8e8f9b]">관계성</h3>
                <div className="rounded-2xl border border-[#e2d7c8] bg-[#fcf8f1] p-4">
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#e4d8c8] bg-white px-3 py-2 text-sm text-[#8b7d6f]">
                    <Search className="h-4 w-4" />
                    <span>등장인물 검색</span>
                  </div>
                  <div className="space-y-2">
                    {relationCards.map((character) => (
                      <div key={character.id} className="flex items-center justify-between rounded-xl border border-[#e5ddd1] bg-[#fdfaf5] p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d6c6b0] text-xs font-bold text-[#5f5244]">
                            {character.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[#5f5347]">{character.name}</div>
                            <div className="text-xs text-[#938475]">{character.role}</div>
                          </div>
                        </div>
                        <Users className="h-4 w-4 text-[#b5a798]" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e2d7c8] bg-[#fcf8f1] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#6f5f4f]">
                  <Sparkles className="h-4 w-4 text-[#a38f7a]" />
                  <span>작업 상태</span>
                </div>
                <div className="space-y-1 text-xs text-[#8f806f]">
                  <p>프로젝트: {projectQuery.data?.title || "불러오는 중..."}</p>
                  <p>현재 문서: {displayTitle}</p>
                  <p>
                    {lastSavedAt
                      ? `마지막 저장 ${lastSavedAt.toLocaleTimeString()}`
                      : dirty
                        ? "저장 대기 중..."
                        : "저장 대기 중인 변경 없음"}
                  </p>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function BookOpenTextIcon() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e6dccf] text-[#6f5f4f]">
      <Globe className="h-4 w-4" />
    </span>
  )
}

