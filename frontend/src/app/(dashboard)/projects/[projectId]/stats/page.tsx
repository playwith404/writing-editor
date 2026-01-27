"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function StatsPage() {
    const params = useParams<{ projectId: string }>()
    const projectId = params?.projectId

    const statsQuery = useQuery({
        queryKey: ["stats", projectId],
        queryFn: () => api.stats.project(projectId!),
        enabled: !!projectId
    })

    const stats = statsQuery.data

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">스탯</h2>
                <p className="text-muted-foreground">집필 진행 상황을 확인하세요.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">총 단어 수</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Number(stats?.wordCount ?? 0).toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">문서</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Number(stats?.documents ?? 0).toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">인물</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Number(stats?.characters ?? 0).toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">세계관</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Number(stats?.worldSettings ?? 0).toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">플롯</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Number(stats?.plots ?? 0).toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>일별 집필량</CardTitle>
                    <CardDescription>일별 기록/그래프는 추후 제공 예정입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground text-center py-8">
                        준비 중
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
