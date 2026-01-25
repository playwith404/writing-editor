"use client"

import { useParams } from "next/navigation"
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
    const params = useParams()
    const { isSidebarOpen, isRightPanelOpen, toggleSidebar, toggleRightPanel, focusMode, setFocusMode } = useEditorStore()

    // Mock Data for Tree
    const treeData = [
        {
            id: '1', name: 'Chapter 1: The Beginning', type: 'folder' as const, children: [
                { id: '1-1', name: 'Scene 1: Morning', type: 'file' as const },
                { id: '1-2', name: 'Scene 2: The Call', type: 'file' as const },
            ]
        },
        { id: '2', name: 'Chapter 2: Departure', type: 'folder' as const, children: [] },
    ]

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden">
            {/* Header */}
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
                        <h1 className="text-sm font-semibold">The Silent Echo</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setFocusMode(true)}>
                        <Focus className="mr-2 h-4 w-4" /> Focus
                    </Button>
                    <Button variant="ghost" size="icon" onClick={toggleRightPanel} className={cn(isRightPanelOpen && "bg-accent")}>
                        <PanelRight className="h-4 w-4" />
                    </Button>
                    <Button variant="default" size="sm">
                        <Save className="mr-2 h-4 w-4" /> Save
                    </Button>
                </div>
            </header>

            {/* Floating Focus Mode Exit Button */}
            {focusMode && (
                <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <Button variant="secondary" size="sm" onClick={() => setFocusMode(false)} className="shadow-lg opacity-50 hover:opacity-100 transition-opacity">
                        Exit Focus
                    </Button>
                </div>
            )}

            <ResizablePanelGroup orientation="horizontal" className="flex-1">
                {/* Sidebar Panel */}
                {isSidebarOpen && (
                    <>
                        <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className={cn("border-r bg-muted/10", focusMode && "hidden")}>
                            <div className="p-4 h-full flex flex-col">
                                <div className="font-semibold text-xs text-muted-foreground mb-4 uppercase tracking-wider">Manuscript</div>
                                <ProjectTree data={treeData} />
                            </div>
                        </ResizablePanel>
                        <ResizableHandle />
                    </>
                )}

                {/* Main Editor Panel */}
                <ResizablePanel defaultSize={60}>
                    <div className="h-full overflow-y-auto bg-muted/30 flex justify-center p-8">
                        <TipTapEditor />
                    </div>
                </ResizablePanel>

                {/* Right Panel */}
                {isRightPanelOpen && (
                    <>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className={cn(focusMode && "hidden")}>
                            <RightPanel />
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>
        </div>
    )
}
