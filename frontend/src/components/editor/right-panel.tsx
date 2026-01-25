"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Globe, Bot, BarChart2 } from "lucide-react"
import { useEditorStore } from "@/stores/editor-store"

export function RightPanel() {
    const { activeRightPanelTab, setRightPanelTab } = useEditorStore()

    return (
        <div className="flex flex-col h-full bg-background border-l">
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
                    {activeRightPanelTab === 'character' && <CharacterPanel />}
                    {activeRightPanelTab === 'world' && <WorldPanel />}
                    {activeRightPanelTab === 'ai' && <AIPanel />}
                    {activeRightPanelTab === 'stats' && <StatsPanel />}
                </div>
            </ScrollArea>
        </div>
    )
}

function CharacterPanel() {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <h3 className="font-semibold text-sm">주요 인물</h3>
                <div className="p-3 bg-muted/50 rounded-lg text-sm border hover:border-primary/50 cursor-pointer transition-colors">
                    <div className="font-medium">엘라라 밴스</div>
                    <div className="text-xs text-muted-foreground mt-1">주인공, 24세, 마법사</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-sm border hover:border-primary/50 cursor-pointer transition-colors">
                    <div className="font-medium">카엘렌</div>
                    <div className="text-xs text-muted-foreground mt-1">악역, 나이 미상</div>
                </div>
            </div>
            <div className="space-y-2 pt-4">
                <h3 className="font-semibold text-sm">조연</h3>
                <div className="text-sm text-muted-foreground italic">아직 추가된 인물이 없습니다.</div>
            </div>
        </div>
    )
}

function WorldPanel() {
    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-sm">장소</h3>
            <div className="p-3 bg-muted/50 rounded-lg text-sm border">
                <div className="font-medium">은빛 성채</div>
                <div className="text-xs text-muted-foreground mt-1">마법 기술을 사용하는 왕국의 수도.</div>
            </div>
        </div>
    )
}

function AIPanel() {
    return (
        <div className="flex flex-col h-full gap-4">
            <div className="p-4 bg-primary/10 rounded-lg text-sm text-primary">
                AI 어시스턴트가 집필을 도와드릴 준비가 됐어요.
            </div>
            <div className="text-sm text-muted-foreground">
                장면 묘사, 이름 생성, 플롯 구멍 점검 등을 요청해 보세요.
            </div>
        </div>
    )
}

function StatsPanel() {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-muted/30 rounded border text-center">
                    <div className="text-2xl font-bold">12.5k</div>
                    <div className="text-xs text-muted-foreground">단어</div>
                </div>
                <div className="p-3 bg-muted/30 rounded border text-center">
                    <div className="text-2xl font-bold">45</div>
                    <div className="text-xs text-muted-foreground">분</div>
                </div>
            </div>
        </div>
    )
}
