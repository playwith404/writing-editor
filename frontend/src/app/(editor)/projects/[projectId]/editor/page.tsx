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
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import Sidebar from "@/components/dashboard/Sidebar"
import { TipTapEditor } from "@/components/editor/tiptap-editor"
import { api, ApiError } from "@/lib/api"

type ProjectDocument = {
  id: string
  title: string
  type?: string | null
  parentId?: string | null
  orderIndex?: number | null
  createdAt?: string
  content?: string | null
}

type WorldSettingItem = {
  id: string
  title: string
  category?: string | null
  content?: string | null
}

type CharacterItem = {
  id: string
  name: string
  role?: string | null
}

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

function parseOrderedParam(value: string | null, prefix: "chapter" | "episode"): number | null {
  if (!value) return null
  const match = new RegExp(`^${prefix}-(\\d+)$`).exec(value)
  if (!match) return null
  const parsed = Number(match[1])
  if (!Number.isInteger(parsed) || parsed < 1) return null
  return parsed
}

function compareByOrderIndex(a: ProjectDocument, b: ProjectDocument) {
  return (Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0)) || String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))
}

function fallbackTitle(chapter: string | null, episode: string | null) {
  const chapterNo = parseOrderedParam(chapter, "chapter")
  const episodeNo = parseOrderedParam(episode, "episode")

  if (!chapterNo) return "새 문서"
  if (!episodeNo) return `${chapterNo}장. 나의 삶`
  return `${chapterNo}장 ${episodeNo}화`
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
  const queryClient = useQueryClient()
  const editorRef = useRef<Editor | null>(null)
  const routeSyncRef = useRef<string | null>(null)

  const projectId = params.projectId
  const chapterParam = searchParams.get("chapter")
  const episodeParam = searchParams.get("episode")

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
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

  const documentsQuery = useQuery({
    queryKey: ["documents", projectId],
    queryFn: () => api.documents.list(projectId),
    enabled: Boolean(projectId),
  })

  const worldSettingsQuery = useQuery({
    queryKey: ["world-settings", projectId],
    queryFn: () => api.worldSettings.list(projectId),
    enabled: Boolean(projectId),
  })

  const charactersQuery = useQuery({
    queryKey: ["characters", projectId],
    queryFn: () => api.characters.list(projectId),
    enabled: Boolean(projectId),
  })

  const documents = useMemo(() => ((documentsQuery.data ?? []) as ProjectDocument[]), [documentsQuery.data])
  const worldSettings = useMemo(() => ((worldSettingsQuery.data ?? []) as WorldSettingItem[]), [worldSettingsQuery.data])
  const characters = useMemo(() => ((charactersQuery.data ?? []) as CharacterItem[]), [charactersQuery.data])

  const documentMap = useMemo(() => {
    const map = new Map<string, ProjectDocument>()
    for (const doc of documents) map.set(String(doc.id), doc)
    return map
  }, [documents])

  const currentDocument = selectedDocumentId ? documentMap.get(selectedDocumentId) ?? null : null

  const saveMutation = useMutation({
    mutationFn: async (payload: { id: string; content: string }) => api.documents.update(payload.id, { content: payload.content }),
    onSuccess: async () => {
      setDirty(false)
      setLastSavedAt(new Date())
      setSaveError(null)
      await queryClient.invalidateQueries({ queryKey: ["documents", projectId] })
    },
    onError: (error) => {
      setSaveError(error instanceof ApiError ? error.message : "저장에 실패했습니다.")
    },
  })

  useEffect(() => {
    if (!chapterParam || !projectId || documentsQuery.isLoading || documentsQuery.isError) return

    const syncKey = `${projectId}:${chapterParam}:${episodeParam ?? ""}`
    if (routeSyncRef.current === syncKey) return

    let cancelled = false

    const syncRouteToDocument = async () => {
      const chapterNo = parseOrderedParam(chapterParam, "chapter")
      if (!chapterNo) {
        routeSyncRef.current = syncKey
        return
      }

      let createdAny = false
      const workingDocs = [...documents]
      const rootChapters = workingDocs
        .filter((doc) => String(doc.type ?? "") === "chapter" && (doc.parentId === null || doc.parentId === undefined || doc.parentId === ""))
        .sort(compareByOrderIndex)

      let chapterDoc = rootChapters[chapterNo - 1]

      if (!chapterDoc) {
        try {
          chapterDoc = (await api.documents.create({
            projectId,
            type: "chapter",
            title: `${chapterNo}장`,
            parentId: null,
            content: "",
            orderIndex: rootChapters.length,
          })) as ProjectDocument
          workingDocs.push(chapterDoc)
          createdAny = true
        } catch (error) {
          if (cancelled) return
          setSaveError(error instanceof ApiError ? error.message : "장 문서를 생성하지 못했습니다.")
          return
        }
      }

      if (!chapterDoc || cancelled) return

      const chapterId = String(chapterDoc.id)
      const episodeNo = parseOrderedParam(episodeParam, "episode")

      if (!episodeNo) {
        setSelectedDocumentId(chapterId)
        routeSyncRef.current = syncKey
        if (createdAny) {
          await queryClient.invalidateQueries({ queryKey: ["documents", projectId] })
        }
        return
      }

      const chapterScenes = workingDocs
        .filter((doc) => String(doc.type ?? "") === "scene" && String(doc.parentId ?? "") === chapterId)
        .sort(compareByOrderIndex)

      let episodeDoc = chapterScenes[episodeNo - 1]

      if (!episodeDoc) {
        try {
          episodeDoc = (await api.documents.create({
            projectId,
            type: "scene",
            title: `${chapterNo}장 ${episodeNo}화`,
            parentId: chapterId,
            content: "",
            orderIndex: chapterScenes.length,
          })) as ProjectDocument
          createdAny = true
        } catch (error) {
          if (cancelled) return
          setSaveError(error instanceof ApiError ? error.message : "화 문서를 생성하지 못했습니다.")
          return
        }
      }

      if (cancelled || !episodeDoc) return
      setSelectedDocumentId(String(episodeDoc.id))
      routeSyncRef.current = syncKey

      if (createdAny) {
        await queryClient.invalidateQueries({ queryKey: ["documents", projectId] })
      }
    }

    void syncRouteToDocument()

    return () => {
      cancelled = true
    }
  }, [projectId, chapterParam, episodeParam, documents, documentsQuery.isLoading, documentsQuery.isError, queryClient])

  useEffect(() => {
    if (chapterParam) return
    if (!selectedDocumentId && documents.length > 0) {
      setSelectedDocumentId(String(documents[0].id))
    }
  }, [chapterParam, documents, selectedDocumentId])

  useEffect(() => {
    if (!currentDocument) return

    const nextContent =
      typeof currentDocument.content === "string" && currentDocument.content.trim().length > 0
        ? currentDocument.content
        : `<h1>${currentDocument.title || "새 문서"}</h1><p>이곳에서 문서를 작성해 보세요.</p>`

    setContent(nextContent)
    setDirty(false)
    setSaveError(null)
  }, [currentDocument])

  useEffect(() => {
    if (!chapterParam) return
    setContent(`<h1>${fallbackTitle(chapterParam, episodeParam)}</h1><p>이곳에서 문서를 작성해 보세요.</p>`)
    setDirty(false)
    setSaveError(null)
  }, [chapterParam, episodeParam])

  useEffect(() => {
    if (!dirty || !selectedDocumentId) return
    const timer = setTimeout(() => {
      saveMutation.mutate({ id: selectedDocumentId, content })
    }, 1000)

    return () => clearTimeout(timer)
  }, [dirty, selectedDocumentId, content, saveMutation])

  const displayTitle = useMemo(
    () => currentDocument?.title || fallbackTitle(chapterParam, episodeParam),
    [currentDocument?.title, chapterParam, episodeParam]
  )

  const wordCount = useMemo(() => {
    const plain = stripHtml(content)
    if (!plain) return 0
    return plain.split(" ").filter(Boolean).length
  }, [content])

  const formattedWordCount = useMemo(() => `${new Intl.NumberFormat("en-US").format(wordCount)} WORDS`, [wordCount])

  const worldCards = useMemo(() => {
    if (worldSettings.length > 0) {
      return worldSettings.slice(0, 2).map((item, index) => ({
        id: item.id,
        title: item.title || "제목 없음",
        description: item.content?.slice(0, 58) || "세계관 정보를 입력해 보세요.",
        tone: index === 0 ? "warm" : "plain",
      }))
    }

    return [
      { id: "term-1", title: "밥 쥐", description: "밥을 달라는 뜻이에요.", tone: "warm" as const },
      { id: "term-2", title: "맘마 쥐", description: "배고플 때 쓰는 신호예요.", tone: "plain" as const },
    ]
  }, [worldSettings])

  const relationCards = useMemo(() => {
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
  }, [characters])

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
            <span className="mx-1 h-4 w-px bg-[#dbcdbb]" />
            <ToolbarButton
              title="제목 1"
              active={toolbarState.heading1}
              onClick={() => runCommand((editor) => editor.chain().focus().toggleHeading({ level: 1 }).run())}
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="제목 2"
              active={toolbarState.heading2}
              onClick={() => runCommand((editor) => editor.chain().focus().toggleHeading({ level: 2 }).run())}
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

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[#e1d6c7] bg-[#fcf8f1] px-3 py-1 text-xs font-bold tracking-wide text-[#8b7b69]">
              {formattedWordCount}
            </span>
            <button
              type="button"
              onClick={exportDocument}
              className="inline-flex items-center gap-2 rounded-xl border border-[#deceb9] bg-[#fffdf8] px-4 py-2 text-sm font-semibold text-[#6e5f50] transition hover:bg-[#f6efe4]"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </header>

        {saveError && (
          <div className="border-b border-[#ebd6d1] bg-[#f8ece9] px-8 py-2 text-sm text-[#9b5149]">
            {saveError}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto bg-[#f5f0e6] px-6 py-8 lg:px-10 lg:py-10">
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
                  <p>{lastSavedAt ? `마지막 저장 ${lastSavedAt.toLocaleTimeString()}` : dirty ? "저장 대기 중..." : "저장 대기 중인 변경 없음"}</p>
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
