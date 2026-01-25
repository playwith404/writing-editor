"use client"

import * as React from "react"
import { ChevronRight, FileText, Folder, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface TreeItem {
    id: string
    name: string
    type: "folder" | "file"
    children?: TreeItem[]
}

interface ProjectTreeProps {
    data: TreeItem[]
    onSelect?: (item: TreeItem) => void
}

export function ProjectTree({ data, onSelect }: ProjectTreeProps) {
    return (
        <div className="flex flex-col gap-1 text-sm">
            {data.map((item) => (
                <TreeItemNode key={item.id} item={item} onSelect={onSelect} />
            ))}
        </div>
    )
}

function TreeItemNode({ item, onSelect, depth = 0 }: { item: TreeItem; onSelect?: (item: TreeItem) => void; depth?: number }) {
    const [isOpen, setIsOpen] = React.useState(true)

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsOpen(!isOpen)
    }

    const handleSelect = () => {
        onSelect?.(item)
    }

    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer group",
                )}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={handleSelect}
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

                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </div>

            {item.type === 'folder' && isOpen && item.children && (
                <div className="flex flex-col gap-1">
                    {item.children.map((child) => (
                        <TreeItemNode key={child.id} item={child} onSelect={onSelect} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    )
}
