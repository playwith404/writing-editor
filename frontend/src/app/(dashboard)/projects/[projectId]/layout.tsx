"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    const params = useParams<{ projectId: string }>()
    const projectId = params?.projectId

    const projectQuery = useQuery({
        queryKey: ["projects", projectId],
        queryFn: () => api.projects.get(projectId!),
        enabled: !!projectId
    })

    if (!projectId) return null

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    {projectQuery.isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold tracking-tight">{projectQuery.data?.title}</h1>
                            <p className="text-sm text-muted-foreground">{projectQuery.data?.genre || "장르 미설정"}</p>
                        </>
                    )}
                </div>
            </div>
            <div className="flex-1">
                {children}
            </div>
        </div>
    )
}
