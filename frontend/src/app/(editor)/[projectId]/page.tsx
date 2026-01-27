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
        mutationFn: async (payload: { title: string }) => {
            return api.documents.create({
                projectId,
                type: "chapter",
                title: payload.title,
                content: "",
                orderIndex: documents.length,
            })
        },
        onSuccess: async (created: any) => {
            await queryClient.invalidateQueries({ queryKey: ["documents", projectId] })
            setSelectedDocumentId(created.id)
            setNewDocTitle("")
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
        type Node = { id: string; name: string; type: "folder" | "file"; children?: Node[] }
        const nodes = new Map<string, Node & { parentId?: string; orderIndex?: number; createdAt?: string }>()
        for (const d of documents) {
            nodes.set(d.id, {
                id: d.id,
                name: d.title,
                type: "file",
                children: [],
                parentId: d.parentId ?? undefined,
                orderIndex: d.orderIndex ?? 0,
                createdAt: d.createdAt,
            })
        }

        const roots: (Node & any)[] = []
        for (const node of nodes.values()) {
            if (node.parentId && nodes.has(node.parentId)) {
                nodes.get(node.parentId)!.children!.push(node)
            } else {
                roots.push(node)
            }
        }

        const sortNodes = (arr: (Node & any)[]) => {
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
        <div className="flex flex-col h-screen bg-background overflow-hidden">
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
                                <div className="flex gap-2 mb-3">
                                    <Input
                                        value={newDocTitle}
                                        onChange={(e) => setNewDocTitle(e.target.value)}
                                        placeholder="새 문서 제목"
                                    />
                                    <Button
                                        size="sm"
                                        disabled={!newDocTitle.trim() || createDocMutation.isPending}
                                        onClick={() => createDocMutation.mutate({ title: newDocTitle.trim() })}
                                    >
                                        추가
                                    </Button>
                                </div>
                                <ProjectTree
                                    data={treeData}
                                    onSelect={(item) => {
                                        setSelectedDocumentId(item.id)
                                    }}
                                />
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
        </div>
    )
}
