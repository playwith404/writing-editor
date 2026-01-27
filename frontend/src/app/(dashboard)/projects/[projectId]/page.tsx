"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, MapPin, Edit3 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ProjectDashboardPage() {
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">총 단어 수</CardTitle>
                        <Edit3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Number(stats?.wordCount ?? 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">현재 작성된 총 분량</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">캐릭터</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Number(stats?.characters ?? 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">등록된 등장인물</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">세계관</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Number(stats?.worldSettings ?? 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">등록된 세계관 항목</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>최근 활동</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">아직 기록된 활동이 없습니다.</p>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>빠른 작업</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <Button asChild className="w-full justify-start" variant="outline">
                            <Link href={`/${projectId}`}>
                                <Edit3 className="mr-2 h-4 w-4" /> 집필실로 이동
                            </Link>
                        </Button>
                        <Button asChild className="w-full justify-start" variant="outline">
                            <Link href={`/projects/${projectId}/planning`}>
                                <Users className="mr-2 h-4 w-4" /> 캐릭터 관리
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
