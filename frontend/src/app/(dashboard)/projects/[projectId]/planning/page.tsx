"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, ApiError } from "@/lib/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function PlanningPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params?.projectId

  if (!projectId) {
    return <div className="text-sm text-muted-foreground">프로젝트를 찾을 수 없습니다.</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">기획실</h2>
        <p className="text-muted-foreground">작품의 세계관과 설정을 관리하세요.</p>
      </div>

      <Tabs defaultValue="characters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="characters">등장인물</TabsTrigger>
          <TabsTrigger value="plots">줄거리</TabsTrigger>
          <TabsTrigger value="world">세계관</TabsTrigger>
          <TabsTrigger value="research">자료</TabsTrigger>
        </TabsList>

        <TabsContent value="characters" className="space-y-4">
          <CharactersSection projectId={projectId} />
        </TabsContent>

        <TabsContent value="plots" className="space-y-4">
          <PlotsSection projectId={projectId} />
        </TabsContent>

        <TabsContent value="world" className="space-y-4">
          <WorldSection projectId={projectId} />
        </TabsContent>

        <TabsContent value="research" className="space-y-4">
          <ResearchSection projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CharactersSection({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [error, setError] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ["characters", projectId],
    queryFn: () => api.characters.list(projectId),
  })

  const items = useMemo(() => (q.data ?? []) as any[], [q.data])

  const create = useMutation({
    mutationFn: async () => {
      setError(null)
      return api.characters.create({ projectId, name: name.trim(), role: role.trim() || undefined })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["characters", projectId] })
      setName("")
      setRole("")
    },
    onError: (e) => {
      if (e instanceof ApiError) setError(e.message)
      else setError("인물 등록에 실패했습니다.")
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => api.characters.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["characters", projectId] })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>등장인물</CardTitle>
        <CardDescription>작품에 등장하는 인물들을 관리합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="역할(선택)" />
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "추가 중..." : "인물 추가"}
          </Button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}

        {q.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
        {q.isError && <div className="text-sm text-red-600">목록을 불러오지 못했습니다.</div>}

        {!q.isLoading && items.length === 0 && (
          <div className="text-sm text-muted-foreground p-8 text-center border rounded-md border-dashed">
            등록된 캐릭터가 없습니다.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {items.map((c) => (
            <div key={c.id} className="rounded-md border p-3 flex items-start justify-between gap-3 bg-muted/20">
              <div className="min-w-0">
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{c.role || "역할 미지정"}</div>
              </div>
              <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(String(c.id))}>
                삭제
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function WorldSection({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [category, setCategory] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [error, setError] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ["world-settings", projectId],
    queryFn: () => api.worldSettings.list(projectId),
  })
  const items = useMemo(() => (q.data ?? []) as any[], [q.data])

  const create = useMutation({
    mutationFn: async () => {
      setError(null)
      return api.worldSettings.create({
        projectId,
        category: category.trim() || "기타",
        title: title.trim(),
        content: content.trim() || undefined,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["world-settings", projectId] })
      setCategory("")
      setTitle("")
      setContent("")
    },
    onError: (e) => {
      if (e instanceof ApiError) setError(e.message)
      else setError("세계관 등록에 실패했습니다.")
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => api.worldSettings.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["world-settings", projectId] })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>세계관</CardTitle>
        <CardDescription>작품의 배경과 설정을 기록합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="카테고리(예: 지리/역사/마법)" />
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
          <Button disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "추가 중..." : "설정 추가"}
          </Button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용(선택)"
          className="w-full min-h-28 rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        />

        {error && <div className="text-sm text-red-600">{error}</div>}

        {q.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
        {q.isError && <div className="text-sm text-red-600">목록을 불러오지 못했습니다.</div>}

        {!q.isLoading && items.length === 0 && (
          <div className="text-sm text-muted-foreground p-8 text-center border rounded-md border-dashed">
            등록된 설정이 없습니다.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {items.map((w) => (
            <div key={w.id} className="rounded-md border p-3 flex items-start justify-between gap-3 bg-muted/20">
              <div className="min-w-0">
                <div className="font-medium truncate">{w.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{w.category}</div>
              </div>
              <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(String(w.id))}>
                삭제
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function PlotsSection({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ["plots", projectId],
    queryFn: () => api.plots.list(projectId),
  })
  const items = useMemo(() => (q.data ?? []) as any[], [q.data])

  const create = useMutation({
    mutationFn: async () => {
      setError(null)
      return api.plots.create({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        orderIndex: items.length,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["plots", projectId] })
      setTitle("")
      setDescription("")
    },
    onError: (e) => {
      if (e instanceof ApiError) setError(e.message)
      else setError("플롯 등록에 실패했습니다.")
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => api.plots.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["plots", projectId] })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>줄거리</CardTitle>
        <CardDescription>플롯과 사건을 구성합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="플롯 제목" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명(선택)" />
          <Button disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "추가 중..." : "플롯 추가"}
          </Button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}

        {q.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
        {q.isError && <div className="text-sm text-red-600">목록을 불러오지 못했습니다.</div>}

        {!q.isLoading && items.length === 0 && (
          <div className="text-sm text-muted-foreground p-8 text-center border rounded-md border-dashed">
            등록된 줄거리가 없습니다.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {items.map((p) => (
            <div key={p.id} className="rounded-md border p-3 flex items-start justify-between gap-3 bg-muted/20">
              <div className="min-w-0">
                <div className="font-medium truncate">{p.title}</div>
                {p.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</div>}
              </div>
              <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(String(p.id))}>
                삭제
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ResearchSection({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ["research", projectId],
    queryFn: () => api.research.list(projectId),
  })
  const items = useMemo(() => (q.data ?? []) as any[], [q.data])

  const create = useMutation({
    mutationFn: async () => {
      setError(null)
      return api.generators.research({ projectId, query: query.trim() })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["research", projectId] })
      setQuery("")
    },
    onError: (e) => {
      if (e instanceof ApiError) setError(e.message)
      else setError("자료 조사 생성에 실패했습니다.")
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => api.research.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["research", projectId] })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>자료 조사</CardTitle>
        <CardDescription>집필에 필요한 자료를 수집합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예) 1920년대 런던 경찰 조직" />
          <Button disabled={!query.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "생성 중..." : "AI 조사 생성"}
          </Button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}

        {q.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
        {q.isError && <div className="text-sm text-red-600">목록을 불러오지 못했습니다.</div>}

        {!q.isLoading && items.length === 0 && (
          <div className="text-sm text-muted-foreground p-8 text-center border rounded-md border-dashed">
            등록된 자료가 없습니다.
          </div>
        )}

        <div className="space-y-3">
          {items.map((ri) => (
            <div key={ri.id} className="rounded-md border p-3 bg-muted/20 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{ri.query}</div>
                  <div className="text-xs text-muted-foreground">{ri.createdAt ? new Date(ri.createdAt).toLocaleString() : ""}</div>
                </div>
                <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(String(ri.id))}>
                  삭제
                </Button>
              </div>
              {ri.result && (
                <pre className="whitespace-pre-wrap text-xs bg-background rounded border p-3 overflow-x-auto">{JSON.stringify(ri.result, null, 2)}</pre>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

