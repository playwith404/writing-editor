"use client"

import { useMemo, useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Globe, Bot, BarChart2 } from "lucide-react"
import { useEditorStore } from "@/stores/editor-store"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

export function RightPanel({
    projectId,
    documentId,
    onInsertText,
}: {
    projectId: string
    documentId?: string
    onInsertText?: (text: string) => void
}) {
    const { activeRightPanelTab, setRightPanelTab } = useEditorStore()

    return (
        <div className="flex flex-col h-full min-h-0 bg-background border-l">
            <div className="p-2 border-b">
                <Tabs value={activeRightPanelTab} onValueChange={(v) => setRightPanelTab(v as any)} className="w-full">
                    <TabsList className="w-full grid grid-cols-4">
                        <TabsTrigger value="character" title="인물"><Users className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="world" title="세계관"><Globe className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="ai" title="AI 어시스턴트"><Bot className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="stats" title="통계"><BarChart2 className="h-4 w-4" /></TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4">
                    {activeRightPanelTab === 'character' && <CharacterPanel projectId={projectId} />}
                    {activeRightPanelTab === 'world' && <WorldPanel projectId={projectId} />}
                    {activeRightPanelTab === 'ai' && <AIPanel projectId={projectId} documentId={documentId} onInsertText={onInsertText} />}
                    {activeRightPanelTab === 'stats' && <StatsPanel projectId={projectId} />}
                </div>
            </ScrollArea>
        </div>
    )
}

function CharacterPanel({ projectId }: { projectId: string }) {
    const queryClient = useQueryClient()

    const charactersQuery = useQuery({
        queryKey: ["characters", projectId],
        queryFn: () => api.characters.list(projectId),
    })

    const characters = useMemo(() => (charactersQuery.data ?? []) as any[], [charactersQuery.data])
    const [createOpen, setCreateOpen] = useState(false)
    const [name, setName] = useState("")
    const [role, setRole] = useState("")
    const [createError, setCreateError] = useState<string | null>(null)

    const createCharacter = useMutation({
        mutationFn: async () => {
            setCreateError(null)
            return api.characters.create({ projectId, name: name.trim(), role: role.trim() || undefined })
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["characters", projectId] })
            setName("")
            setRole("")
            setCreateOpen(false)
        },
        onError: (err) => {
            if (err instanceof ApiError) setCreateError(err.message)
            else setCreateError("인물 등록에 실패했습니다.")
        },
    })

    const deleteCharacter = useMutation({
        mutationFn: async (id: string) => api.characters.delete(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["characters", projectId] })
        },
    })

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <h3 className="font-semibold text-sm">인물</h3>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant={createOpen ? "secondary" : "outline"} onClick={() => (setCreateError(null), setCreateOpen((p) => !p))}>
                        {createOpen ? "닫기" : "인물 추가"}
                    </Button>
                </div>

                {createOpen && (
                    <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                        <div className="grid gap-2">
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
                            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="역할(선택)" />
                        </div>
                        {createError && <div className="text-sm text-red-600">{createError}</div>}
                        <Button size="sm" disabled={!name.trim() || createCharacter.isPending} onClick={() => createCharacter.mutate()}>
                            {createCharacter.isPending ? "추가 중..." : "등록"}
                        </Button>
                    </div>
                )}

                {charactersQuery.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
                {charactersQuery.isError && <div className="text-sm text-red-600">인물 목록을 불러오지 못했습니다.</div>}
                {!charactersQuery.isLoading && characters.length === 0 && (
                    <div className="text-sm text-muted-foreground">아직 등록된 인물이 없습니다.</div>
                )}
                {characters.map((c) => (
                    <div key={c.id} className="p-3 bg-muted/50 rounded-lg text-sm border flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="font-medium truncate">{c.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{c.role || "역할 미지정"}</div>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={deleteCharacter.isPending}
                            onClick={() => deleteCharacter.mutate(String(c.id))}
                        >
                            삭제
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    )
}

function WorldPanel({ projectId }: { projectId: string }) {
    const queryClient = useQueryClient()

    const worldQuery = useQuery({
        queryKey: ["world-settings", projectId],
        queryFn: () => api.worldSettings.list(projectId),
    })

    const items = useMemo(() => (worldQuery.data ?? []) as any[], [worldQuery.data])
    const [createOpen, setCreateOpen] = useState(false)
    const [category, setCategory] = useState("")
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [createError, setCreateError] = useState<string | null>(null)

    const createWorld = useMutation({
        mutationFn: async () => {
            setCreateError(null)
            return api.worldSettings.create({
                projectId,
                category: category.trim() || "기타",
                title: title.trim(),
                content: content.trim() || undefined,
            })
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["world-settings", projectId] })
            setCategory("")
            setTitle("")
            setContent("")
            setCreateOpen(false)
        },
        onError: (err) => {
            if (err instanceof ApiError) setCreateError(err.message)
            else setCreateError("세계관 등록에 실패했습니다.")
        },
    })

    const deleteWorld = useMutation({
        mutationFn: async (id: string) => api.worldSettings.delete(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["world-settings", projectId] })
        },
    })

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-sm">세계관</h3>
            <div className="flex items-center gap-2">
                <Button size="sm" variant={createOpen ? "secondary" : "outline"} onClick={() => (setCreateError(null), setCreateOpen((p) => !p))}>
                    {createOpen ? "닫기" : "설정 추가"}
                </Button>
            </div>

            {createOpen && (
                <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                    <div className="grid gap-2">
                        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="카테고리(예: 지리/역사/마법)" />
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="내용(선택)"
                            className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>
                    {createError && <div className="text-sm text-red-600">{createError}</div>}
                    <Button size="sm" disabled={!title.trim() || createWorld.isPending} onClick={() => createWorld.mutate()}>
                        {createWorld.isPending ? "추가 중..." : "등록"}
                    </Button>
                </div>
            )}

            {worldQuery.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
            {worldQuery.isError && <div className="text-sm text-red-600">세계관 정보를 불러오지 못했습니다.</div>}
            {!worldQuery.isLoading && items.length === 0 && (
                <div className="text-sm text-muted-foreground">아직 등록된 세계관 항목이 없습니다.</div>
            )}
            {items.map((w) => (
                <div key={w.id} className="p-3 bg-muted/50 rounded-lg text-sm border flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="font-medium truncate">{w.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{w.category}</div>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={deleteWorld.isPending}
                        onClick={() => deleteWorld.mutate(String(w.id))}
                    >
                        삭제
                    </Button>
                </div>
            ))}
        </div>
    )
}

function AIPanel({
    projectId,
    documentId,
    onInsertText,
}: {
    projectId: string
    documentId?: string
    onInsertText?: (text: string) => void
}) {
    const [provider, setProvider] = useState<"openai" | "anthropic" | "gemini">("openai")
    const [model, setModel] = useState("")

    const quotaQuery = useQuery({
        queryKey: ["ai-quota"],
        queryFn: () => api.ai.quota(),
    })

    const quotaLabel = useMemo(() => {
        const q = quotaQuery.data
        if (!q) return "불러오는 중..."
        if (q.limit === null) return `이번 달 사용량: ${q.used} (무제한)`
        return `이번 달 사용량: ${q.used}/${q.limit} (남음 ${q.remaining})`
    }, [quotaQuery.data])

    const [prompt, setPrompt] = useState("")
    const [completeResult, setCompleteResult] = useState<string>("")
    const [completeError, setCompleteError] = useState<string | null>(null)

    const complete = useMutation({
        mutationFn: async () => {
            return api.ai.complete({ prompt, provider, model: model || undefined })
        },
        onSuccess: (res) => {
            setCompleteResult(res.content || "")
            setCompleteError(null)
        },
        onError: (err) => {
            if (err instanceof ApiError) setCompleteError(err.message)
            else setCompleteError("AI 요청에 실패했습니다.")
        },
    })

    const [translateLang, setTranslateLang] = useState("en")
    const [translateResult, setTranslateResult] = useState<string>("")
    const [translateError, setTranslateError] = useState<string | null>(null)
    const translate = useMutation({
        mutationFn: async () => api.generators.translate({ documentId, targetLanguage: translateLang, provider, model: model || undefined }),
        onSuccess: (res: any) => {
            setTranslateResult(res?.content || "")
            setTranslateError(null)
        },
        onError: (err) => {
            if (err instanceof ApiError) setTranslateError(err.message)
            else setTranslateError("번역 생성에 실패했습니다.")
        },
    })

    const [researchQuery, setResearchQuery] = useState("")
    const [researchResult, setResearchResult] = useState<string>("")
    const [researchError, setResearchError] = useState<string | null>(null)
    const research = useMutation({
        mutationFn: async () => api.generators.research({ projectId, query: researchQuery, provider, model: model || undefined }),
        onSuccess: (res: any) => {
            setResearchResult(res?.result?.content || "")
            setResearchError(null)
        },
        onError: (err) => {
            if (err instanceof ApiError) setResearchError(err.message)
            else setResearchError("자료 조사에 실패했습니다.")
        },
    })

    const [storyboardResult, setStoryboardResult] = useState<string>("")
    const [storyboardError, setStoryboardError] = useState<string | null>(null)
    const storyboard = useMutation({
        mutationFn: async () => api.generators.storyboard({ documentId, provider, model: model || undefined }),
        onSuccess: (res: any) => {
            setStoryboardResult(JSON.stringify(res?.content ?? res, null, 2))
            setStoryboardError(null)
        },
        onError: (err) => {
            if (err instanceof ApiError) setStoryboardError(err.message)
            else setStoryboardError("스토리보드 생성에 실패했습니다.")
        },
    })

    const [predictResult, setPredictResult] = useState<string>("")
    const [predictError, setPredictError] = useState<string | null>(null)
    const predict = useMutation({
        mutationFn: async () => api.generators.predict({ documentId, provider, model: model || undefined }),
        onSuccess: (res: any) => {
            setPredictResult(JSON.stringify(res?.result ?? res, null, 2))
            setPredictError(null)
        },
        onError: (err) => {
            if (err instanceof ApiError) setPredictError(err.message)
            else setPredictError("독자반응 예측에 실패했습니다.")
        },
    })

    const [voice, setVoice] = useState("")
    const [ttsResult, setTtsResult] = useState<string>("")
    const [ttsError, setTtsError] = useState<string | null>(null)
    const tts = useMutation({
        mutationFn: async () => api.generators.tts({ documentId, voice: voice || undefined, provider, model: model || undefined }),
        onSuccess: (res: any) => {
            setTtsResult(res?.script || "")
            setTtsError(null)
        },
        onError: (err) => {
            if (err instanceof ApiError) setTtsError(err.message)
            else setTtsError("TTS 생성에 실패했습니다.")
        },
    })

    return (
        <div className="flex flex-col gap-4">
            <div className="p-3 bg-muted/30 rounded border text-sm">
                <div className="font-medium">AI 사용량</div>
                <div className="text-muted-foreground mt-1">{quotaLabel}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">제공자</div>
                    <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value as any)}
                        className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                    >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="gemini">Gemini</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">모델(선택)</div>
                    <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="예) gpt-4o-mini" />
                </div>
            </div>

            <Separator />

            <div className="space-y-2">
                <div className="font-semibold text-sm">이어쓰기 / 제안</div>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="예) 다음 문장을 이어서 써줘..."
                    className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                />
                {completeError && <div className="text-sm text-red-600">{completeError}</div>}
                <div className="flex gap-2">
                    <Button disabled={!prompt.trim() || complete.isPending} onClick={() => complete.mutate()}>
                        {complete.isPending ? "요청 중..." : "생성"}
                    </Button>
                    <Button
                        variant="secondary"
                        disabled={!completeResult.trim()}
                        onClick={() => onInsertText?.(completeResult)}
                    >
                        에디터에 삽입
                    </Button>
                </div>
                {completeResult && (
                    <pre className="whitespace-pre-wrap text-sm bg-muted/30 rounded border p-3">{completeResult}</pre>
                )}
            </div>

            <Separator />

            <div className="space-y-2">
                <div className="font-semibold text-sm">번역</div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">대상 언어</div>
                        <Input value={translateLang} onChange={(e) => setTranslateLang(e.target.value)} placeholder="en" />
                    </div>
                </div>
                {translateError && <div className="text-sm text-red-600">{translateError}</div>}
                <div className="flex gap-2">
                    <Button disabled={!documentId || !translateLang.trim() || translate.isPending} onClick={() => translate.mutate()}>
                        {translate.isPending ? "생성 중..." : "번역 생성"}
                    </Button>
                    <Button variant="secondary" disabled={!translateResult.trim()} onClick={() => onInsertText?.(translateResult)}>
                        에디터에 삽입
                    </Button>
                </div>
                {!documentId && <div className="text-xs text-muted-foreground">문서를 선택하면 번역을 생성할 수 있어요.</div>}
                {translateResult && (
                    <pre className="whitespace-pre-wrap text-sm bg-muted/30 rounded border p-3">{translateResult}</pre>
                )}
            </div>

            <Separator />

            <div className="space-y-2">
                <div className="font-semibold text-sm">자료 조사</div>
                <Input value={researchQuery} onChange={(e) => setResearchQuery(e.target.value)} placeholder="예) 1920년대 런던 경찰 조직" />
                {researchError && <div className="text-sm text-red-600">{researchError}</div>}
                <Button disabled={!researchQuery.trim() || research.isPending} onClick={() => research.mutate()}>
                    {research.isPending ? "생성 중..." : "조사 생성"}
                </Button>
                {researchResult && (
                    <pre className="whitespace-pre-wrap text-sm bg-muted/30 rounded border p-3">{researchResult}</pre>
                )}
            </div>

            <Separator />

            <div className="space-y-2">
                <div className="font-semibold text-sm">웹툰 스토리보드</div>
                {storyboardError && <div className="text-sm text-red-600">{storyboardError}</div>}
                <Button disabled={!documentId || storyboard.isPending} onClick={() => storyboard.mutate()}>
                    {storyboard.isPending ? "생성 중..." : "스토리보드 생성"}
                </Button>
                {!documentId && <div className="text-xs text-muted-foreground">문서를 선택하면 스토리보드를 생성할 수 있어요.</div>}
                {storyboardResult && (
                    <pre className="whitespace-pre-wrap text-xs bg-muted/30 rounded border p-3">{storyboardResult}</pre>
                )}
            </div>

            <Separator />

            <div className="space-y-2">
                <div className="font-semibold text-sm">독자반응 예측</div>
                {predictError && <div className="text-sm text-red-600">{predictError}</div>}
                <Button disabled={!documentId || predict.isPending} onClick={() => predict.mutate()}>
                    {predict.isPending ? "생성 중..." : "예측 생성"}
                </Button>
                {!documentId && <div className="text-xs text-muted-foreground">문서를 선택하면 예측을 생성할 수 있어요.</div>}
                {predictResult && (
                    <pre className="whitespace-pre-wrap text-xs bg-muted/30 rounded border p-3">{predictResult}</pre>
                )}
            </div>

            <Separator />

            <div className="space-y-2">
                <div className="font-semibold text-sm">오디오북(TTS 스크립트)</div>
                <Input value={voice} onChange={(e) => setVoice(e.target.value)} placeholder="음성(선택)" />
                {ttsError && <div className="text-sm text-red-600">{ttsError}</div>}
                <div className="flex gap-2">
                    <Button disabled={!documentId || tts.isPending} onClick={() => tts.mutate()}>
                        {tts.isPending ? "생성 중..." : "TTS 생성"}
                    </Button>
                    <Button variant="secondary" disabled={!ttsResult.trim()} onClick={() => onInsertText?.(ttsResult)}>
                        에디터에 삽입
                    </Button>
                </div>
                {!documentId && <div className="text-xs text-muted-foreground">문서를 선택하면 TTS 스크립트를 생성할 수 있어요.</div>}
                {ttsResult && (
                    <pre className="whitespace-pre-wrap text-sm bg-muted/30 rounded border p-3">{ttsResult}</pre>
                )}
            </div>
        </div>
    )
}

function StatsPanel({ projectId }: { projectId: string }) {
    const statsQuery = useQuery({
        queryKey: ["stats", projectId],
        queryFn: () => api.stats.project(projectId),
    })

    const stats = statsQuery.data as any
    return (
        <div className="space-y-4">
            {statsQuery.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
            {statsQuery.isError && <div className="text-sm text-red-600">통계를 불러오지 못했습니다.</div>}
            {stats && (
                <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-muted/30 rounded border text-center">
                        <div className="text-2xl font-bold">{Number(stats.wordCount ?? 0).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">단어</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded border text-center">
                        <div className="text-2xl font-bold">{Number(stats.documents ?? 0).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">문서</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded border text-center">
                        <div className="text-2xl font-bold">{Number(stats.characters ?? 0).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">인물</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded border text-center">
                        <div className="text-2xl font-bold">{Number(stats.plots ?? 0).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">플롯</div>
                    </div>
                </div>
            )}
        </div>
    )
}
