"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { TipTapEditor } from "@/components/editor/tiptap-editor"
import { ProjectTree } from "@/components/editor/project-tree"
import { RightPanel } from "@/components/editor/right-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Save, PanelLeft, PanelRight, Focus, Users } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useEditorStore } from "@/stores/editor-store"
import { cn } from "@/lib/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError } from "@/lib/api"
import { useProjectSync } from "@/hooks/use-project-sync"
import type { Editor } from "@tiptap/react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"

export default function EditorPage() {
    const params = useParams<{ projectId: string }>()
    const projectId = params.projectId

    const { isSidebarOpen, isRightPanelOpen, toggleSidebar, toggleRightPanel, focusMode, setFocusMode } = useEditorStore()

    // react-resizable-panels v4: number는 px, string은 %로 해석됨.
    const sidebarDefaultSize = "20"
    const rightPanelDefaultSize = "25"
    const editorDefaultSize = String(
        100
        - (isSidebarOpen ? Number(sidebarDefaultSize) : 0)
        - (isRightPanelOpen ? Number(rightPanelDefaultSize) : 0)
    )

    const queryClient = useQueryClient()
    const editorRef = useRef<Editor | null>(null)
    const wsSendTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
    const [content, setContent] = useState<string>("")
    const [dirty, setDirty] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
    const [newDocTitle, setNewDocTitle] = useState("")
    const [newDocType, setNewDocType] = useState<"series" | "part" | "chapter" | "scene">("chapter")
    const [newDocParentId, setNewDocParentId] = useState<string>("")

    const [meta, setMeta] = useState<{ title: string; status: string; notes: string }>({ title: "", status: "draft", notes: "" })
    const [metaDirty, setMetaDirty] = useState(false)
    const [metaError, setMetaError] = useState<string | null>(null)
    const [versionsOpen, setVersionsOpen] = useState(false)
    const [snapshotName, setSnapshotName] = useState("")

    const projectQuery = useQuery({
        queryKey: ["projects", projectId],
        queryFn: () => api.projects.get(projectId),
    })

    const documentsQuery = useQuery({
        queryKey: ["documents", projectId],
        queryFn: () => api.documents.list(projectId),
    })

    const documents = useMemo(() => (documentsQuery.data ?? []) as any[], [documentsQuery.data])

    const documentById = useMemo(() => {
        const map = new Map<string, any>()
        for (const d of documents) map.set(d.id, d)
        return map
    }, [documents])

    const currentDoc = selectedDocumentId ? documentById.get(selectedDocumentId) : null

    const versionsQuery = useQuery({
        queryKey: ["documentVersions", selectedDocumentId],
        queryFn: () => api.documentVersions.list(selectedDocumentId as string),
        enabled: Boolean(selectedDocumentId),
    })

    const versions = useMemo(() => (versionsQuery.data ?? []) as any[], [versionsQuery.data])

    useEffect(() => {
        if (!selectedDocumentId && documents.length > 0) {
            setSelectedDocumentId(documents[0].id)
        }
    }, [documents, selectedDocumentId])

    useEffect(() => {
        if (!currentDoc) return
        setContent(currentDoc.content ?? "")
        setDirty(false)
        setSaveError(null)
    }, [currentDoc?.id])

    useEffect(() => {
        if (!currentDoc) return
        setMeta({
            title: currentDoc.title ?? "",
            status: currentDoc.status ?? "draft",
            notes: currentDoc.notes ?? "",
        })
        setMetaDirty(false)
        setMetaError(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDoc?.id])

    const saveMutation = useMutation({
        mutationFn: async (payload: { id: string; content: string }) => {
            return api.documents.update(payload.id, { content: payload.content })
        },
        onSuccess: (updated: any) => {
            setDirty(false)
            setLastSavedAt(new Date())
            setSaveError(null)
            queryClient.setQueryData(["documents", projectId], (prev: any) => {
                if (!Array.isArray(prev)) return prev
                return prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d))
            })
        },
        onError: (err) => {
            if (err instanceof ApiError) setSaveError(err.message)
            else setSaveError("저장에 실패했습니다.")
        },
    })

    const createDocMutation = useMutation({
        mutationFn: async (payload: { title: string; type: string; parentId?: string | null }) => {
            const parentKey = payload.parentId ?? null
            const siblings = documents.filter((d) => String(d.parentId ?? "") === String(parentKey ?? ""))
            const max = siblings.length ? Math.max(...siblings.map((d) => Number(d.orderIndex ?? 0))) : -1
            const nextOrderIndex = max + 1

            return api.documents.create({
                projectId,
                type: payload.type,
                title: payload.title,
                parentId: payload.parentId ?? null,
                content: "",
                orderIndex: nextOrderIndex,
            })
        },
        onSuccess: async (created: any) => {
            await queryClient.invalidateQueries({ queryKey: ["documents", projectId] })
            setSelectedDocumentId(created.id)
            setNewDocTitle("")
            setNewDocParentId("")
        },
    })

    const updateMetaMutation = useMutation({
        mutationFn: async () => {
            if (!selectedDocumentId) return null
            setMetaError(null)
            return api.documents.update(selectedDocumentId, {
                title: meta.title.trim(),
                status: meta.status,
                notes: meta.notes.trim() || null,
            })
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["documents", projectId] })
            setMetaDirty(false)
        },
        onError: (err) => {
            if (err instanceof ApiError) setMetaError(err.message)
            else setMetaError("저장에 실패했습니다.")
        },
    })

    const deleteDocMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.documents.delete(id)
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["documents", projectId] })
            setSelectedDocumentId(null)
        },
        onError: (err) => {
            if (err instanceof ApiError) setSaveError(err.message)
            else setSaveError("삭제에 실패했습니다.")
        },
    })

    const reorderMutation = useMutation({
        mutationFn: async ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
            const source = documentById.get(sourceId)
            const target = documentById.get(targetId)
            if (!source || !target) return

            const sourceParent = source.parentId ?? null
            const targetParent = target.parentId ?? null
            if (String(sourceParent ?? "") !== String(targetParent ?? "")) return

            const siblings = documents
                .filter((d) => String(d.parentId ?? "") === String(sourceParent ?? ""))
                .sort((a, b) => (Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0)) || String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")))
            const fromIndex = siblings.findIndex((d) => String(d.id) === sourceId)
            const toIndex = siblings.findIndex((d) => String(d.id) === targetId)
            if (fromIndex < 0 || toIndex < 0) return

            const next = siblings.slice()
            const [moved] = next.splice(fromIndex, 1)
            next.splice(toIndex, 0, moved)

            await Promise.all(
                next.map((d, idx) => api.documents.update(String(d.id), { orderIndex: idx }))
            )
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["documents", projectId] })
        },
    })

    const createSnapshotMutation = useMutation({
        mutationFn: async () => {
            if (!selectedDocumentId) return null
            return api.documentVersions.create({
                documentId: selectedDocumentId,
                versionName: snapshotName.trim() ? `스냅샷: ${snapshotName.trim()}` : "스냅샷",
                content: content ?? "",
                wordCount: Number(currentDoc?.wordCount ?? 0),
            })
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["documentVersions", selectedDocumentId] })
            setSnapshotName("")
        },
        onError: (err) => {
            if (err instanceof ApiError) setSaveError(err.message)
            else setSaveError("스냅샷 생성에 실패했습니다.")
        },
    })

    const restoreVersionMutation = useMutation({
        mutationFn: async (versionId: string) => api.documentVersions.restore(versionId),
        onSuccess: async (doc: any) => {
            await queryClient.invalidateQueries({ queryKey: ["documents", projectId] })
            setContent(doc?.content ?? "")
            setDirty(false)
        },
        onError: (err) => {
            if (err instanceof ApiError) setSaveError(err.message)
            else setSaveError("복원에 실패했습니다.")
        },
    })

    const deleteVersionMutation = useMutation({
        mutationFn: async (versionId: string) => api.documentVersions.delete(versionId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["documentVersions", selectedDocumentId] })
        },
        onError: (err) => {
            if (err instanceof ApiError) setSaveError(err.message)
            else setSaveError("버전 삭제에 실패했습니다.")
        },
    })

    const { connected: wsConnected, presenceCount, sendContentOp } = useProjectSync({
        projectId,
        onContentSync: (payload) => {
            if (!payload?.documentId || typeof payload?.content !== "string") return
            if (payload.documentId !== selectedDocumentId) return
            setContent(payload.content)
            setDirty(false)
        },
    })

    const treeData = useMemo(() => {
        type Node = { id: string; name: string; type: "folder" | "file"; children?: Node[]; parentId?: string | null; orderIndex?: number; createdAt?: string; status?: string; docType?: string }
        const nodes = new Map<string, Node>()
        for (const d of documents) {
            nodes.set(d.id, {
                id: d.id,
                name: d.title,
                type: "file",
                children: [],
                parentId: d.parentId ?? null,
                orderIndex: d.orderIndex ?? 0,
                createdAt: d.createdAt,
                status: d.status,
                docType: d.type,
            })
        }

        const roots: Node[] = []
        for (const node of nodes.values()) {
            if (node.parentId && nodes.has(node.parentId)) {
                nodes.get(node.parentId)!.children!.push(node)
            } else {
                roots.push(node)
            }
        }

        const sortNodes = (arr: Node[]) => {
            arr.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
            for (const n of arr) {
                if (n.children?.length) {
                    n.type = "folder"
                    sortNodes(n.children)
                } else {
                    delete n.children
                }
            }
        }

        sortNodes(roots)
        return roots as any
    }, [documents])

    const onEditorChange = (html: string) => {
        setContent(html)
        setDirty(true)
        setSaveError(null)

        if (wsSendTimer.current) clearTimeout(wsSendTimer.current)
        wsSendTimer.current = setTimeout(() => {
            if (!selectedDocumentId) return
            sendContentOp({ documentId: selectedDocumentId, content: html })
        }, 400)
    }

    useEffect(() => {
        if (!dirty) return
        if (!selectedDocumentId) return
        const timer = setTimeout(() => {
            saveMutation.mutate({ id: selectedDocumentId, content })
        }, 1200)
        return () => clearTimeout(timer)
    }, [dirty, content, selectedDocumentId, saveMutation])

    return (
        <div className="flex flex-col h-screen h-[100dvh] bg-background overflow-hidden">
            {/* 헤더 */}
            <header className={cn("flex items-center justify-between px-4 py-2 border-b transition-all duration-300", focusMode && "h-0 opacity-0 overflow-hidden border-0 py-0")}>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/projects">
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn(isSidebarOpen && "bg-accent")}>
                            <PanelLeft className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="ml-2">
                        <h1 className="text-sm font-semibold">{projectQuery.data?.title ?? "프로젝트"}</h1>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{wsConnected ? "동기화 연결됨" : "동기화 연결 중..."}</span>
                            <span className="inline-flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {presenceCount}
                            </span>
                            {lastSavedAt && <span>마지막 저장 {lastSavedAt.toLocaleTimeString()}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setFocusMode(true)}>
                        <Focus className="mr-2 h-4 w-4" /> 집중 모드
                    </Button>
                    <Button variant="ghost" size="icon" onClick={toggleRightPanel} className={cn(isRightPanelOpen && "bg-accent")}>
                        <PanelRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        disabled={!dirty || saveMutation.isPending || !selectedDocumentId}
                        onClick={() => selectedDocumentId && saveMutation.mutate({ id: selectedDocumentId, content })}
                    >
                        <Save className="mr-2 h-4 w-4" /> 저장
                    </Button>
                </div>
            </header>

            {saveError && (
                <div className="px-4 py-2 text-sm text-red-600 border-b bg-red-50">
                    {saveError}
                </div>
            )}

            {/* 집중 모드 종료 플로팅 버튼 */}
            {focusMode && (
                <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <Button variant="secondary" size="sm" onClick={() => setFocusMode(false)} className="shadow-lg opacity-50 hover:opacity-100 transition-opacity">
                        집중 모드 종료
                    </Button>
                </div>
            )}

            <ResizablePanelGroup orientation="horizontal" className="flex-1 min-w-0 min-h-0">
                {/* 사이드바 패널 */}
                {isSidebarOpen && (
                    <>
                        <ResizablePanel defaultSize={sidebarDefaultSize} minSize="15" maxSize="30" className={cn("min-w-0 min-h-0 border-r bg-muted/10", focusMode && "hidden")}>
                            <div className="p-4 h-full min-h-0 flex flex-col">
                                <div className="font-semibold text-xs text-muted-foreground mb-4 uppercase tracking-wider">원고</div>
                                <div className="rounded-lg border p-3 bg-background space-y-2 mb-3">
                                    <div className="text-xs font-medium text-muted-foreground">새 문서</div>
                                    <Input
                                        value={newDocTitle}
                                        onChange={(e) => setNewDocTitle(e.target.value)}
                                        placeholder="제목"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            value={newDocType}
                                            onChange={(e) => setNewDocType(e.target.value as any)}
                                            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                                        >
                                            <option value="series">시리즈</option>
                                            <option value="part">부</option>
                                            <option value="chapter">장</option>
                                            <option value="scene">씬</option>
                                        </select>
                                        <select
                                            value={newDocParentId}
                                            onChange={(e) => setNewDocParentId(e.target.value)}
                                            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                                        >
                                            <option value="">(루트)</option>
                                            {documents.map((d) => (
                                                <option key={d.id} value={String(d.id)}>
                                                    {String(d.title || "제목 없음")}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <Button
                                        size="sm"
                                        disabled={!newDocTitle.trim() || createDocMutation.isPending}
                                        onClick={() =>
                                            createDocMutation.mutate({
                                                title: newDocTitle.trim(),
                                                type: newDocType,
                                                parentId: newDocParentId ? newDocParentId : null,
                                            })
                                        }
                                    >
                                        {createDocMutation.isPending ? "추가 중..." : "추가"}
                                    </Button>
                                </div>
                                <ProjectTree
                                    data={treeData}
                                    onSelect={(item) => {
                                        setSelectedDocumentId(item.id)
                                    }}
                                    selectedId={selectedDocumentId}
                                    onReorder={(sourceId, targetId) => reorderMutation.mutate({ sourceId, targetId })}
                                />

                                <div className="mt-4 pt-4 border-t space-y-2">
                                    <div className="text-xs font-medium text-muted-foreground">문서 설정</div>
                                    {!currentDoc && (
                                        <div className="text-xs text-muted-foreground">문서를 선택하세요.</div>
                                    )}
                                    {currentDoc && (
                                        <div className="space-y-2">
                                            <Input
                                                value={meta.title}
                                                onChange={(e) => (setMeta((p) => ({ ...p, title: e.target.value })), setMetaDirty(true))}
                                                placeholder="제목"
                                            />
                                            <select
                                                value={meta.status}
                                                onChange={(e) => (setMeta((p) => ({ ...p, status: e.target.value })), setMetaDirty(true))}
                                                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                                            >
                                                <option value="draft">초안</option>
                                                <option value="editing">수정중</option>
                                                <option value="done">완료</option>
                                            </select>
                                            <textarea
                                                value={meta.notes}
                                                onChange={(e) => (setMeta((p) => ({ ...p, notes: e.target.value })), setMetaDirty(true))}
                                                placeholder="메모(선택)"
                                                className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                                            />
                                            {metaError && <div className="text-xs text-red-600">{metaError}</div>}
                                            <div className="flex items-center justify-between gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={deleteDocMutation.isPending}
                                                    onClick={() => {
                                                        if (!selectedDocumentId) return
                                                        if (!confirm("문서를 삭제할까요?")) return
                                                        deleteDocMutation.mutate(selectedDocumentId)
                                                    }}
                                                >
                                                    삭제
                                                </Button>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="sm" disabled={!selectedDocumentId} onClick={() => setVersionsOpen(true)}>
                                                        버전
                                                    </Button>
                                                    <Button size="sm" disabled={!metaDirty || updateMetaMutation.isPending} onClick={() => updateMetaMutation.mutate()}>
                                                        {updateMetaMutation.isPending ? "저장 중..." : "저장"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ResizablePanel>
                        <ResizableHandle />
                    </>
                )}

                {/* 메인 에디터 패널 */}
                <ResizablePanel defaultSize={editorDefaultSize} minSize="40" className="min-w-0 min-h-0">
                    <div className="h-full overflow-y-auto bg-muted/30 flex justify-center p-8">
                        <TipTapEditor
                            content={content}
                            onChange={onEditorChange}
                            onReady={(editor) => (editorRef.current = editor)}
                        />
                    </div>
                </ResizablePanel>

                {/* 오른쪽 패널 */}
                {isRightPanelOpen && (
                    <>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={rightPanelDefaultSize} minSize="20" maxSize="40" className={cn("min-w-0 min-h-0", focusMode && "hidden")}>
                            <RightPanel
                                projectId={projectId}
                                documentId={selectedDocumentId ?? undefined}
                                onInsertText={(text) => editorRef.current?.commands.insertContent(text)}
                            />
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>

            <Sheet open={versionsOpen} onOpenChange={setVersionsOpen}>
                <SheetContent side="right" className="sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>버전 히스토리</SheetTitle>
                        <SheetDescription>문서 스냅샷을 생성하고, 원하는 시점으로 복원할 수 있습니다.</SheetDescription>
                    </SheetHeader>

                    {!selectedDocumentId && (
                        <div className="p-4 text-sm text-muted-foreground">문서를 선택하세요.</div>
                    )}

                    {selectedDocumentId && (
                        <div className="p-4 space-y-4 overflow-y-auto">
                            <div className="rounded-lg border p-3 space-y-2">
                                <div className="text-xs font-medium text-muted-foreground">스냅샷 생성</div>
                                <Input value={snapshotName} onChange={(e) => setSnapshotName(e.target.value)} placeholder="이름(선택)" />
                                <Button disabled={createSnapshotMutation.isPending} onClick={() => createSnapshotMutation.mutate()}>
                                    {createSnapshotMutation.isPending ? "생성 중..." : "스냅샷 저장"}
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <div className="text-xs font-medium text-muted-foreground">버전 목록</div>
                                {versionsQuery.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
                                {versionsQuery.isError && <div className="text-sm text-red-600">버전을 불러오지 못했습니다.</div>}
                                {!versionsQuery.isLoading && versions.length === 0 && (
                                    <div className="text-sm text-muted-foreground">저장된 버전이 없습니다.</div>
                                )}

                                <div className="space-y-2">
                                    {versions.map((v) => (
                                        <div key={v.id} className="rounded-lg border p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="font-medium text-sm truncate">{v.versionName || "버전"}</div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {v.createdAt ? new Date(v.createdAt).toLocaleString() : ""}
                                                        {typeof v.wordCount === "number" ? ` · ${v.wordCount.toLocaleString()} 단어` : ""}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        disabled={restoreVersionMutation.isPending}
                                                        onClick={() => restoreVersionMutation.mutate(String(v.id))}
                                                    >
                                                        복원
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={deleteVersionMutation.isPending}
                                                        onClick={() => {
                                                            if (!confirm("이 버전을 삭제할까요?")) return
                                                            deleteVersionMutation.mutate(String(v.id))
                                                        }}
                                                    >
                                                        삭제
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
