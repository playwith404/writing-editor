"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { api, ApiError } from "@/lib/api"

type Project = {
  id: string
  title: string
  description?: string
  genre?: string
  wordCount?: number
  isPublic?: boolean
  updatedAt?: string
}

function formatWords(wordCount?: number) {
  const n = Number(wordCount ?? 0)
  return `${n.toLocaleString()} 단어`
}

export default function ProjectsPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [genre, setGenre] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.projects.list() as Promise<Project[]>,
  })

  const createProject = useMutation({
    mutationFn: () => api.projects.create({ title, description: description || undefined, genre: genre || undefined }) as Promise<Project>,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] })
      setCreateOpen(false)
      setTitle("")
      setDescription("")
      setGenre("")
    },
    onError: (err) => {
      if (err instanceof ApiError) setCreateError(err.message)
      else setCreateError("프로젝트 생성에 실패했습니다.")
    },
  })

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">프로젝트</h2>
          <p className="text-muted-foreground">스토리와 집필 프로젝트를 관리하세요.</p>
        </div>

        <Sheet open={createOpen} onOpenChange={(v) => (setCreateError(null), setCreateOpen(v))}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> 새 프로젝트
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>새 프로젝트</SheetTitle>
              <SheetDescription>프로젝트 기본 정보를 입력해 주세요.</SheetDescription>
            </SheetHeader>

            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">제목</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="프로젝트 제목" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">장르(선택)</label>
                <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="예) 판타지, 로판" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">설명(선택)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="한 줄 소개"
                  className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {createError && <div className="text-sm text-red-600">{createError}</div>}

              <Button
                className="w-full"
                disabled={!title.trim() || createProject.isPending}
                onClick={() => createProject.mutate()}
              >
                {createProject.isPending ? "생성 중..." : "프로젝트 생성"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {projectsQuery.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
      {projectsQuery.isError && <div className="text-sm text-red-600">프로젝트 목록을 불러오지 못했습니다.</div>}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link key={project.id} href={`/${project.id}`} className="block group">
            <Card className="h-full transition-all group-hover:border-primary/50 group-hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="truncate">{project.title}</CardTitle>
                  <Badge variant="secondary">{project.isPublic ? "공개" : "비공개"}</Badge>
                </div>
                <CardDescription className="line-clamp-2">{project.description || "설명이 없습니다."}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{formatWords(project.wordCount)}</span>
                  {project.genre && <span className="text-muted-foreground">{project.genre}</span>}
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">{project.updatedAt ? `업데이트 ${new Date(project.updatedAt).toLocaleString()}` : ""}</CardFooter>
            </Card>
          </Link>
        ))}

        {!projectsQuery.isLoading && projects.length === 0 && (
          <div className="text-sm text-muted-foreground">아직 프로젝트가 없습니다. 새 프로젝트를 만들어 주세요.</div>
        )}
      </div>
    </div>
  )
}
