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
                        <TabsTrigger value="character" title="Characters"><Users className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="world" title="World"><Globe className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="ai" title="AI Assist"><Bot className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="stats" title="Statistics"><BarChart2 className="h-4 w-4" /></TabsTrigger>
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
                <h3 className="font-semibold text-sm">Main Characters</h3>
                <div className="p-3 bg-muted/50 rounded-lg text-sm border hover:border-primary/50 cursor-pointer transition-colors">
                    <div className="font-medium">Elara Vance</div>
                    <div className="text-xs text-muted-foreground mt-1">Protagonist, 24, Mage</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-sm border hover:border-primary/50 cursor-pointer transition-colors">
                    <div className="font-medium">Kaelen</div>
                    <div className="text-xs text-muted-foreground mt-1">Antagonist, Age unknown</div>
                </div>
            </div>
            <div className="space-y-2 pt-4">
                <h3 className="font-semibold text-sm">Supporting</h3>
                <div className="text-sm text-muted-foreground italic">No characters added yet.</div>
            </div>
        </div>
    )
}

function WorldPanel() {
    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-sm">Locations</h3>
            <div className="p-3 bg-muted/50 rounded-lg text-sm border">
                <div className="font-medium">The Silver Citadel</div>
                <div className="text-xs text-muted-foreground mt-1">Capital city of the Kingdom using magic technology.</div>
            </div>
        </div>
    )
}

function AIPanel() {
    return (
        <div className="flex flex-col h-full gap-4">
            <div className="p-4 bg-primary/10 rounded-lg text-sm text-primary">
                AI Assistant is ready to help you write.
            </div>
            <div className="text-sm text-muted-foreground">
                Ask me to describe a scene, generate names, or check for plot holes.
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
                    <div className="text-xs text-muted-foreground">Words</div>
                </div>
                <div className="p-3 bg-muted/30 rounded border text-center">
                    <div className="text-2xl font-bold">45</div>
                    <div className="text-xs text-muted-foreground">Minutes</div>
                </div>
            </div>
        </div>
    )
}
