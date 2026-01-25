"use client"

import { TipTapEditor } from "@/components/editor/tiptap-editor"
import { ProjectTree } from "@/components/editor/project-tree"
import { RightPanel } from "@/components/editor/right-panel"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Save, PanelLeft, PanelRight, Focus } from "lucide-react"
import Link from "next/link"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useEditorStore } from "@/stores/editor-store"
import { cn } from "@/lib/utils"

export default function EditorPage() {
    const { isSidebarOpen, isRightPanelOpen, toggleSidebar, toggleRightPanel, focusMode, setFocusMode } = useEditorStore()

    // react-resizable-panels v4: number는 px, string은 %로 해석됨.
    const sidebarDefaultSize = "20"
    const rightPanelDefaultSize = "25"
    const editorDefaultSize = String(
        100
        - (isSidebarOpen ? Number(sidebarDefaultSize) : 0)
        - (isRightPanelOpen ? Number(rightPanelDefaultSize) : 0)
    )

    // 트리용 더미 데이터
    const treeData = [
        {
            id: '1', name: '1장: 시작', type: 'folder' as const, children: [
                { id: '1-1', name: '장면 1: 아침', type: 'file' as const },
                { id: '1-2', name: '장면 2: 호출', type: 'file' as const },
            ]
        },
        { id: '2', name: '2장: 출발', type: 'folder' as const, children: [] },
    ]

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
                        <h1 className="text-sm font-semibold">고요한 메아리</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setFocusMode(true)}>
                        <Focus className="mr-2 h-4 w-4" /> 집중 모드
                    </Button>
                    <Button variant="ghost" size="icon" onClick={toggleRightPanel} className={cn(isRightPanelOpen && "bg-accent")}>
                        <PanelRight className="h-4 w-4" />
                    </Button>
                    <Button variant="default" size="sm">
                        <Save className="mr-2 h-4 w-4" /> 저장
                    </Button>
                </div>
            </header>

            {/* 집중 모드 종료 플로팅 버튼 */}
            {focusMode && (
                <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <Button variant="secondary" size="sm" onClick={() => setFocusMode(false)} className="shadow-lg opacity-50 hover:opacity-100 transition-opacity">
                        집중 모드 종료
                    </Button>
                </div>
            )}

            <ResizablePanelGroup orientation="horizontal" className="flex-1 min-w-0">
                {/* 사이드바 패널 */}
                {isSidebarOpen && (
                    <>
                        <ResizablePanel defaultSize={sidebarDefaultSize} minSize="15" maxSize="30" className={cn("min-w-0 border-r bg-muted/10", focusMode && "hidden")}>
                            <div className="p-4 h-full flex flex-col">
                                <div className="font-semibold text-xs text-muted-foreground mb-4 uppercase tracking-wider">원고</div>
                                <ProjectTree data={treeData} />
                            </div>
                        </ResizablePanel>
                        <ResizableHandle />
                    </>
                )}

                {/* 메인 에디터 패널 */}
                <ResizablePanel defaultSize={editorDefaultSize} minSize="40" className="min-w-0">
                    <div className="h-full overflow-y-auto bg-muted/30 flex justify-center p-8">
                        <TipTapEditor />
                    </div>
                </ResizablePanel>

                {/* 오른쪽 패널 */}
                {isRightPanelOpen && (
                    <>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={rightPanelDefaultSize} minSize="20" maxSize="40" className={cn("min-w-0", focusMode && "hidden")}>
                            <RightPanel />
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>
        </div>
    )
}
