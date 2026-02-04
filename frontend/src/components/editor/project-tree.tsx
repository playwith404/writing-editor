"use client"

import * as React from "react"
import { ChevronRight, FileText, Folder, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface TreeItem {
    id: string
    name: string
    type: "folder" | "file"
    children?: TreeItem[]
    parentId?: string | null
    orderIndex?: number
    status?: string
    docType?: string
}

interface ProjectTreeProps {
    data: TreeItem[]
    onSelect?: (item: TreeItem) => void
    selectedId?: string | null
    onReorder?: (sourceId: string, targetId: string) => void
}

export function ProjectTree({ data, onSelect, selectedId, onReorder }: ProjectTreeProps) {
    const [draggingId, setDraggingId] = React.useState<string | null>(null)
    const [overId, setOverId] = React.useState<string | null>(null)

    return (
        <div className="flex flex-col gap-1 text-sm">
            {data.map((item) => (
                <TreeItemNode
                    key={item.id}
                    item={item}
                    onSelect={onSelect}
                    selectedId={selectedId}
                    onReorder={onReorder}
                    draggingId={draggingId}
                    setDraggingId={setDraggingId}
                    overId={overId}
                    setOverId={setOverId}
                />
            ))}
        </div>
    )
}

function statusBadge(status?: string) {
    const key = (status ?? "draft").toLowerCase()
    if (key === "done" || key === "completed") return { label: "완료", variant: "default" as const }
    if (key === "editing" || key === "in_progress" || key === "in_revision") return { label: "수정중", variant: "secondary" as const }
    return { label: "초안", variant: "outline" as const }
}

function TreeItemNode({
    item,
    onSelect,
    selectedId,
    onReorder,
    draggingId,
    setDraggingId,
    overId,
    setOverId,
    depth = 0,
}: {
    item: TreeItem
    onSelect?: (item: TreeItem) => void
    selectedId?: string | null
    onReorder?: (sourceId: string, targetId: string) => void
    draggingId: string | null
    setDraggingId: (id: string | null) => void
    overId: string | null
    setOverId: (id: string | null) => void
    depth?: number
}) {
    const [isOpen, setIsOpen] = React.useState(true)

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsOpen(!isOpen)
    }

    const handleSelect = () => {
        onSelect?.(item)
    }

    const canDrop = Boolean(onReorder && draggingId && draggingId !== item.id)

    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer group select-none",
                    selectedId === item.id && "bg-accent text-accent-foreground",
                    overId === item.id && canDrop && "ring-2 ring-primary/50",
                )}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={handleSelect}
                draggable={Boolean(onReorder)}
                onDragStart={(e) => {
                    if (!onReorder) return
                    setDraggingId(item.id)
                    setOverId(null)
                    e.dataTransfer.effectAllowed = "move"
                    try {
                        e.dataTransfer.setData("text/plain", item.id)
                    } catch {
                        // ignore
                    }
                }}
                onDragEnd={() => {
                    setDraggingId(null)
                    setOverId(null)
                }}
                onDragOver={(e) => {
                    if (!canDrop) return
                    e.preventDefault()
                    setOverId(item.id)
                    e.dataTransfer.dropEffect = "move"
                }}
                onDragLeave={() => {
                    if (overId === item.id) setOverId(null)
                }}
                onDrop={(e) => {
                    if (!onReorder) return
                    e.preventDefault()
                    const sourceId = draggingId || e.dataTransfer.getData("text/plain")
                    if (!sourceId || sourceId === item.id) return
                    setDraggingId(null)
                    setOverId(null)
                    onReorder(sourceId, item.id)
                }}
            >
                <span
                    className={cn("p-0.5 rounded-sm hover:bg-muted-foreground/20 text-muted-foreground", item.type === 'file' && "invisible")}
                    onClick={handleToggle}
                >
                    <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                </span>

                {item.type === 'folder' ? (
                    <Folder className="h-4 w-4 text-sky-500 fill-sky-500/20" />
                ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                )}

                <span className="flex-1 truncate">{item.name}</span>

                {item.type === "file" && (
                    <Badge variant={statusBadge(item.status).variant} className="h-5 px-2 text-[11px]">
                        {statusBadge(item.status).label}
                    </Badge>
                )}

                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </div>

            {item.type === 'folder' && isOpen && item.children && (
                <div className="flex flex-col gap-1">
                    {item.children.map((child) => (
                        <TreeItemNode
                            key={child.id}
                            item={child}
                            onSelect={onSelect}
                            selectedId={selectedId}
                            onReorder={onReorder}
                            draggingId={draggingId}
                            setDraggingId={setDraggingId}
                            overId={overId}
                            setOverId={setOverId}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
