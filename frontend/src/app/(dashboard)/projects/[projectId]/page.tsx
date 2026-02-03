"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { BookOpen, PenTool } from "lucide-react"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProjectDashboardPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const projectQuery = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.projects.get(projectId),
  })

  const statsQuery = useQuery({
    queryKey: ["stats", "project", projectId],
    queryFn: () => api.stats.project(projectId),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight truncate">
            {projectQuery.data?.title ?? "프로젝트"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {projectQuery.data?.description ?? "프로젝트 대시보드"}
          </p>
        </div>
        <Button asChild>
          <Link href={`/${projectId}`} target="_blank">
            <PenTool className="mr-2 h-4 w-4" />
            에디터 열기
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">문서</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {statsQuery.data?.documents ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">인물</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {statsQuery.data?.characters ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">세계관</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {statsQuery.data?.worldSettings ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">총 단어</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {Number(statsQuery.data?.wordCount ?? 0).toLocaleString()}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> 다음 작업
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link className="underline underline-offset-4" href={`/projects/${projectId}/planning`}>
              기획실에서 설정/플롯 정리하기
            </Link>
            <div>
              <Link className="underline underline-offset-4" href={`/projects/${projectId}/publishing`}>
                퍼블리싱 내보내기/전달
              </Link>
            </div>
            <div>
              <Link className="underline underline-offset-4" href={`/projects/${projectId}/backup`}>
                백업 내보내기/복원
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

