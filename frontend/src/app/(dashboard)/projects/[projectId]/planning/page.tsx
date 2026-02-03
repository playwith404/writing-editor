"use client"

import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RelationshipDiagram } from "@/components/planning/relationship-diagram"

export default function PlanningPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">기획실</h2>
        <p className="text-sm text-muted-foreground">
          인물/세계관/관계도/플롯을 한 곳에서 관리합니다.
        </p>
      </div>

      <Tabs defaultValue="characters">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="characters">인물</TabsTrigger>
          <TabsTrigger value="world">세계관</TabsTrigger>
          <TabsTrigger value="relationships">관계도</TabsTrigger>
          <TabsTrigger value="plots">플롯</TabsTrigger>
        </TabsList>

        <TabsContent value="characters">
          <CharactersTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="world">
          <WorldTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="relationships">
          <RelationshipsTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="plots">
          <PlotsTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CharactersTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient()

  const charactersQuery = useQuery({
    queryKey: ["characters", projectId],
    queryFn: () => api.characters.list(projectId),
  })
  const characters = useMemo(() => (charactersQuery.data ?? []) as any[], [charactersQuery.data])

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => (selectedId ? characters.find((c) => String(c.id) === selectedId) : null), [characters, selectedId])

  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: async () => {
      setCreateError(null)
      return api.characters.create({ projectId, name: name.trim(), role: role.trim() || undefined })
    },
    onSuccess: async (created) => {
      await qc.invalidateQueries({ queryKey: ["characters", projectId] })
      setSelectedId(String(created.id))
      setName("")
      setRole("")
      setCreateOpen(false)
    },
    onError: (err) => setCreateError(err instanceof ApiError ? err.message : "인물 등록에 실패했습니다."),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.characters.delete(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["characters", projectId] })
      setSelectedId(null)
    },
  })

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">인물 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant={createOpen ? "secondary" : "outline"} onClick={() => (setCreateError(null), setCreateOpen((v) => !v))}>
            {createOpen ? "닫기" : "인물 추가"}
          </Button>

          {createOpen && (
            <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="역할(선택)" />
              {createError && <div className="text-sm text-red-600">{createError}</div>}
              <Button size="sm" disabled={!name.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? "추가 중..." : "등록"}
              </Button>
            </div>
          )}

          <Separator />

          {charactersQuery.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
          {!charactersQuery.isLoading && characters.length === 0 && (
            <div className="text-sm text-muted-foreground">아직 등록된 인물이 없습니다.</div>
          )}
          <div className="space-y-2">
            {characters.map((c) => (
              <button
                key={c.id}
                className={`w-full text-left rounded-md border px-3 py-2 text-sm hover:bg-muted/30 ${selectedId === String(c.id) ? "border-primary" : ""}`}
                onClick={() => setSelectedId(String(c.id))}
              >
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground truncate">{c.role || "역할 없음"}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <CharacterDetail
        projectId={projectId}
        character={selected}
        onDeleted={(id) => deleteMutation.mutate(id)}
        deleting={deleteMutation.isPending}
      />
    </div>
  )
}

function parseJsonObject(text: string): Record<string, any> | null {
  const trimmed = text.trim()
  if (!trimmed) return {}
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, any>
    return null
  } catch {
    return null
  }
}

function CharacterDetail({
  projectId,
  character,
  onDeleted,
  deleting,
}: {
  projectId: string
  character: any | null
  onDeleted: (id: string) => void
  deleting: boolean
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<{
    name: string
    role: string
    backstory: string
    speechSample: string
    imageUrl: string
    profileJson: string
    appearanceJson: string
    personalityJson: string
  }>({
    name: "",
    role: "",
    backstory: "",
    speechSample: "",
    imageUrl: "",
    profileJson: "{}",
    appearanceJson: "{}",
    personalityJson: "{}",
  })
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const selectedId = character?.id ? String(character.id) : null

  useEffect(() => {
    if (!character) return
    setForm({
      name: character.name ?? "",
      role: character.role ?? "",
      backstory: character.backstory ?? "",
      speechSample: character.speechSample ?? "",
      imageUrl: character.imageUrl ?? "",
      profileJson: JSON.stringify(character.profile ?? {}, null, 2),
      appearanceJson: JSON.stringify(character.appearance ?? {}, null, 2),
      personalityJson: JSON.stringify(character.personality ?? {}, null, 2),
    })
    setError(null)
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return null
      const profile = parseJsonObject(form.profileJson)
      const appearance = parseJsonObject(form.appearanceJson)
      const personality = parseJsonObject(form.personalityJson)
      if (profile === null || appearance === null || personality === null) {
        throw new ApiError("JSON 형식이 올바르지 않습니다.", 400, null)
      }
      setError(null)
      return api.characters.update(selectedId, {
        projectId,
        name: form.name.trim(),
        role: form.role.trim() || null,
        backstory: form.backstory.trim() || null,
        speechSample: form.speechSample.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        profile,
        appearance,
        personality,
      })
    },
    onSuccess: async () => {
      if (!selectedId) return
      await qc.invalidateQueries({ queryKey: ["characters", projectId] })
      setDirty(false)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "저장에 실패했습니다."),
  })

  if (!character) {
    return (
      <Card className="min-h-[320px]">
        <CardHeader>
          <CardTitle className="text-base">인물 상세</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          왼쪽에서 인물을 선택하세요.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">인물 상세</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">이름</div>
            <Input
              value={form.name}
              onChange={(e) => (setForm((p) => ({ ...p, name: e.target.value })), setDirty(true))}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">역할</div>
            <Input
              value={form.role}
              onChange={(e) => (setForm((p) => ({ ...p, role: e.target.value })), setDirty(true))}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">배경(Backstory)</div>
          <textarea
            value={form.backstory}
            onChange={(e) => (setForm((p) => ({ ...p, backstory: e.target.value })), setDirty(true))}
            className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="과거사/목표/트라우마 등"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">말투 샘플</div>
          <textarea
            value={form.speechSample}
            onChange={(e) => (setForm((p) => ({ ...p, speechSample: e.target.value })), setDirty(true))}
            className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="예) “흥, 내가 왜…”"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">이미지 URL(선택)</div>
          <Input
            value={form.imageUrl}
            onChange={(e) => (setForm((p) => ({ ...p, imageUrl: e.target.value })), setDirty(true))}
            placeholder="https://..."
          />
        </div>

        <Separator />

        <div className="grid gap-3 lg:grid-cols-3">
          <JsonBox
            label="프로필(JSON)"
            value={form.profileJson}
            onChange={(v) => (setForm((p) => ({ ...p, profileJson: v })), setDirty(true))}
          />
          <JsonBox
            label="외모(JSON)"
            value={form.appearanceJson}
            onChange={(v) => (setForm((p) => ({ ...p, appearanceJson: v })), setDirty(true))}
          />
          <JsonBox
            label="성격(JSON)"
            value={form.personalityJson}
            onChange={(v) => (setForm((p) => ({ ...p, personalityJson: v })), setDirty(true))}
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            disabled={deleting}
            onClick={() => selectedId && onDeleted(selectedId)}
          >
            삭제
          </Button>
          <Button disabled={!dirty || updateMutation.isPending} onClick={() => updateMutation.mutate()}>
            {updateMutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function JsonBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-40 font-mono rounded-md border bg-background px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        spellCheck={false}
      />
    </div>
  )
}

function WorldTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient()

  const worldQuery = useQuery({
    queryKey: ["world-settings", projectId],
    queryFn: () => api.worldSettings.list(projectId),
  })
  const items = useMemo(() => (worldQuery.data ?? []) as any[], [worldQuery.data])

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => (selectedId ? items.find((w) => String(w.id) === selectedId) : null), [items, selectedId])

  const [category, setCategory] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: async () => {
      setCreateError(null)
      return api.worldSettings.create({
        projectId,
        category: category.trim() || "기타",
        title: title.trim(),
        content: content.trim() || undefined,
      })
    },
    onSuccess: async (created) => {
      await qc.invalidateQueries({ queryKey: ["world-settings", projectId] })
      setSelectedId(String(created.id))
      setCategory("")
      setTitle("")
      setContent("")
      setCreateOpen(false)
    },
    onError: (err) => setCreateError(err instanceof ApiError ? err.message : "세계관 등록에 실패했습니다."),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.worldSettings.delete(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["world-settings", projectId] })
      setSelectedId(null)
    },
  })

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">세계관 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant={createOpen ? "secondary" : "outline"} onClick={() => (setCreateError(null), setCreateOpen((v) => !v))}>
            {createOpen ? "닫기" : "설정 추가"}
          </Button>

          {createOpen && (
            <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="카테고리(예: 지리/역사/마법)" />
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용(선택)"
                className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
              {createError && <div className="text-sm text-red-600">{createError}</div>}
              <Button size="sm" disabled={!title.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? "추가 중..." : "등록"}
              </Button>
            </div>
          )}

          <Separator />

          {worldQuery.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
          {!worldQuery.isLoading && items.length === 0 && (
            <div className="text-sm text-muted-foreground">아직 등록된 세계관 항목이 없습니다.</div>
          )}
          <div className="space-y-2">
            {items.map((w) => (
              <button
                key={w.id}
                className={`w-full text-left rounded-md border px-3 py-2 text-sm hover:bg-muted/30 ${selectedId === String(w.id) ? "border-primary" : ""}`}
                onClick={() => setSelectedId(String(w.id))}
              >
                <div className="font-medium truncate">{w.title}</div>
                <div className="text-xs text-muted-foreground truncate">{w.category || "기타"}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <WorldDetail
        projectId={projectId}
        item={selected}
        deleting={deleteMutation.isPending}
        onDeleted={(id) => deleteMutation.mutate(id)}
      />
    </div>
  )
}

function WorldDetail({
  projectId,
  item,
  deleting,
  onDeleted,
}: {
  projectId: string
  item: any | null
  deleting: boolean
  onDeleted: (id: string) => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<{ category: string; title: string; content: string }>({ category: "", title: "", content: "" })
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const id = item?.id ? String(item.id) : null

  useEffect(() => {
    if (!item) return
    setForm({
      category: item.category ?? "",
      title: item.title ?? "",
      content: item.content ?? "",
    })
    setDirty(false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!id) return null
      setError(null)
      return api.worldSettings.update(id, {
        projectId,
        category: form.category.trim() || "기타",
        title: form.title.trim(),
        content: form.content.trim() || null,
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["world-settings", projectId] })
      setDirty(false)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "저장에 실패했습니다."),
  })

  if (!item) {
    return (
      <Card className="min-h-[320px]">
        <CardHeader>
          <CardTitle className="text-base">세계관 상세</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          왼쪽에서 항목을 선택하세요.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">세계관 상세</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">카테고리</div>
            <Input value={form.category} onChange={(e) => (setForm((p) => ({ ...p, category: e.target.value })), setDirty(true))} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">제목</div>
            <Input value={form.title} onChange={(e) => (setForm((p) => ({ ...p, title: e.target.value })), setDirty(true))} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">내용</div>
          <textarea
            value={form.content}
            onChange={(e) => (setForm((p) => ({ ...p, content: e.target.value })), setDirty(true))}
            className="w-full min-h-48 rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" disabled={deleting} onClick={() => id && onDeleted(id)}>
            삭제
          </Button>
          <Button disabled={!dirty || updateMutation.isPending} onClick={() => updateMutation.mutate()}>
            {updateMutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RelationshipsTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient()

  const charactersQuery = useQuery({
    queryKey: ["characters", projectId],
    queryFn: () => api.characters.list(projectId),
  })
  const characters = useMemo(() => (charactersQuery.data ?? []) as any[], [charactersQuery.data])

  const relQuery = useQuery({
    queryKey: ["relationships", projectId],
    queryFn: () => api.relationships.list(projectId),
  })
  const relationships = useMemo(() => (relQuery.data ?? []) as any[], [relQuery.data])

  const diagramCharacters = useMemo(() => {
    return characters.map((c) => ({
      id: String(c.id),
      name: String(c.name ?? ""),
      role: c.role ?? null,
    }))
  }, [characters])

  const diagramRelationships = useMemo(() => {
    return relationships.map((r) => ({
      id: String(r.id),
      characterAId: String(r.characterAId),
      characterBId: String(r.characterBId),
      relationType: r.relationType ?? null,
      isBidirectional: r.isBidirectional ?? null,
    }))
  }, [relationships])

  const [aId, setAId] = useState("")
  const [bId, setBId] = useState("")
  const [relationType, setRelationType] = useState("")
  const [description, setDescription] = useState("")
  const [bidirectional, setBidirectional] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: async () => {
      setError(null)
      if (!aId || !bId) throw new ApiError("인물 A/B를 선택해 주세요.", 400, null)
      if (aId === bId) throw new ApiError("인물 A와 B는 달라야 합니다.", 400, null)
      return api.relationships.create({
        projectId,
        characterAId: aId,
        characterBId: bId,
        relationType: relationType.trim() || null,
        description: description.trim() || null,
        isBidirectional: bidirectional,
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["relationships", projectId] })
      setRelationType("")
      setDescription("")
      setAId("")
      setBId("")
      setBidirectional(true)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "관계 생성에 실패했습니다."),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.relationships.delete(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["relationships", projectId] })
    },
  })

  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of characters) map.set(String(c.id), String(c.name ?? ""))
    return map
  }, [characters])

  return (
    <div className="space-y-4">
      <Tabs defaultValue="diagram">
        <TabsList>
          <TabsTrigger value="diagram">드래그 관계도</TabsTrigger>
          <TabsTrigger value="manage">관계 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="diagram">
          <RelationshipDiagram
            projectId={projectId}
            characters={diagramCharacters}
            relationships={diagramRelationships}
          />
        </TabsContent>

        <TabsContent value="manage">
          <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">관계 추가</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">인물 A</div>
                  <select
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={aId}
                    onChange={(e) => setAId(e.target.value)}
                  >
                    <option value="">선택</option>
                    {characters.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">인물 B</div>
                  <select
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={bId}
                    onChange={(e) => setBId(e.target.value)}
                  >
                    <option value="">선택</option>
                    {characters.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">관계 유형</div>
                  <Input value={relationType} onChange={(e) => setRelationType(e.target.value)} placeholder="예) 연인, 적대, 가족" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">설명(선택)</div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="관계의 배경/맥락"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={bidirectional} onChange={(e) => setBidirectional(e.target.checked)} />
                  양방향 관계
                </label>
                {error && <div className="text-sm text-red-600">{error}</div>}
                <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
                  {createMutation.isPending ? "생성 중..." : "추가"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">관계 목록</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {relQuery.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
                {!relQuery.isLoading && relationships.length === 0 && (
                  <div className="text-sm text-muted-foreground">아직 등록된 관계가 없습니다.</div>
                )}
                {relationships.map((r) => (
                  <div key={r.id} className="rounded-md border p-3 text-sm flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {nameById.get(String(r.characterAId)) || "?"} ↔ {nameById.get(String(r.characterBId)) || "?"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {r.relationType || "유형 없음"} {r.isBidirectional ? "" : "(단방향)"}
                      </div>
                      {r.description && <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{r.description}</div>}
                    </div>
                    <Button size="sm" variant="ghost" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(String(r.id))}>
                      삭제
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PlotsTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient()

  const plotsQuery = useQuery({
    queryKey: ["plots", projectId],
    queryFn: () => api.plots.list(projectId),
  })
  const plots = useMemo(() => (plotsQuery.data ?? []) as any[], [plotsQuery.data])

  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [viewMode, setViewMode] = useState<"timeline" | "three_act" | "snowflake" | "list">("timeline")
  const [createError, setCreateError] = useState<string | null>(null)

  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null)
  const selectedPlot = useMemo(() => (selectedPlotId ? plots.find((p) => String(p.id) === selectedPlotId) : null), [plots, selectedPlotId])

  const createPlot = useMutation({
    mutationFn: async () => {
      setCreateError(null)
      return api.plots.create({
        projectId,
        title: title.trim(),
        description: description.trim() || null,
        metadata: { view: viewMode },
      })
    },
    onSuccess: async (created) => {
      await qc.invalidateQueries({ queryKey: ["plots", projectId] })
      setSelectedPlotId(String(created.id))
      setTitle("")
      setDescription("")
      setCreateOpen(false)
    },
    onError: (err) => setCreateError(err instanceof ApiError ? err.message : "플롯 생성에 실패했습니다."),
  })

  const deletePlot = useMutation({
    mutationFn: async (id: string) => api.plots.delete(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["plots", projectId] })
      setSelectedPlotId(null)
    },
  })

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">플롯</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant={createOpen ? "secondary" : "outline"} onClick={() => (setCreateError(null), setCreateOpen((v) => !v))}>
            {createOpen ? "닫기" : "플롯 추가"}
          </Button>

          {createOpen && (
            <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="플롯 이름" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="설명(선택)"
                className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">뷰 모드</div>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as any)}
                >
                  <option value="timeline">타임라인</option>
                  <option value="list">리스트</option>
                  <option value="three_act">3막 구조</option>
                  <option value="snowflake">스노우플레이크</option>
                </select>
              </div>
              {createError && <div className="text-sm text-red-600">{createError}</div>}
              <Button size="sm" disabled={!title.trim() || createPlot.isPending} onClick={() => createPlot.mutate()}>
                {createPlot.isPending ? "추가 중..." : "등록"}
              </Button>
            </div>
          )}

          <Separator />

          {plotsQuery.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
          {!plotsQuery.isLoading && plots.length === 0 && (
            <div className="text-sm text-muted-foreground">아직 플롯이 없습니다.</div>
          )}
          <div className="space-y-2">
            {plots.map((p) => (
              <button
                key={p.id}
                className={`w-full text-left rounded-md border px-3 py-2 text-sm hover:bg-muted/30 ${selectedPlotId === String(p.id) ? "border-primary" : ""}`}
                onClick={() => setSelectedPlotId(String(p.id))}
              >
                <div className="font-medium truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground truncate">{p.description || ""}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <PlotDetail
        projectId={projectId}
        plot={selectedPlot}
        deleting={deletePlot.isPending}
        onDelete={(id) => deletePlot.mutate(id)}
      />
    </div>
  )
}

function PlotDetail({
  projectId,
  plot,
  deleting,
  onDelete,
}: {
  projectId: string
  plot: any | null
  deleting: boolean
  onDelete: (id: string) => void
}) {
  const qc = useQueryClient()
  const plotId = plot?.id ? String(plot.id) : null

  const pointsQuery = useQuery({
    queryKey: ["plot-points", plotId],
    queryFn: () => (plotId ? api.plotPoints.list(plotId) : Promise.resolve([])),
    enabled: !!plotId,
  })
  const points = useMemo(() => (pointsQuery.data ?? []) as any[], [pointsQuery.data])

  const [pointTitle, setPointTitle] = useState("")
  const [pointDesc, setPointDesc] = useState("")
  const [pointOrder, setPointOrder] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const createPoint = useMutation({
    mutationFn: async () => {
      if (!plotId) return null
      setError(null)
      return api.plotPoints.create({
        plotId,
        title: pointTitle.trim(),
        description: pointDesc.trim() || null,
        orderIndex: Number.isFinite(pointOrder) ? pointOrder : 0,
      })
    },
    onSuccess: async () => {
      if (!plotId) return
      await qc.invalidateQueries({ queryKey: ["plot-points", plotId] })
      setPointTitle("")
      setPointDesc("")
      setPointOrder(0)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "플롯 포인트 생성에 실패했습니다."),
  })

  const deletePoint = useMutation({
    mutationFn: async (id: string) => api.plotPoints.delete(id),
    onSuccess: async () => {
      if (!plotId) return
      await qc.invalidateQueries({ queryKey: ["plot-points", plotId] })
    },
  })

  if (!plot) {
    return (
      <Card className="min-h-[320px]">
        <CardHeader>
          <CardTitle className="text-base">플롯 상세</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          왼쪽에서 플롯을 선택하세요.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">플롯 상세</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold truncate">{plot.title}</div>
            {plot.description && <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{plot.description}</div>}
          </div>
          <Button variant="outline" disabled={deleting} onClick={() => plotId && onDelete(plotId)}>
            삭제
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="font-medium text-sm">플롯 포인트</div>
          <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
            <Input value={pointTitle} onChange={(e) => setPointTitle(e.target.value)} placeholder="포인트 제목" />
            <Input
              value={String(pointOrder)}
              onChange={(e) => setPointOrder(Number(e.target.value))}
              placeholder="순서(숫자)"
            />
            <textarea
              value={pointDesc}
              onChange={(e) => setPointDesc(e.target.value)}
              placeholder="설명(선택)"
              className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Button size="sm" disabled={!pointTitle.trim() || createPoint.isPending} onClick={() => createPoint.mutate()}>
              {createPoint.isPending ? "추가 중..." : "추가"}
            </Button>
          </div>

          {pointsQuery.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
          {!pointsQuery.isLoading && points.length === 0 && (
            <div className="text-sm text-muted-foreground">아직 포인트가 없습니다.</div>
          )}
          <div className="space-y-2">
            {points
              .slice()
              .sort((a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0))
              .map((pt) => (
                <div key={pt.id} className="rounded-md border p-3 text-sm flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {pt.orderIndex ?? 0}. {pt.title}
                    </div>
                    {pt.description && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{pt.description}</div>}
                  </div>
                  <Button size="sm" variant="ghost" disabled={deletePoint.isPending} onClick={() => deletePoint.mutate(String(pt.id))}>
                    삭제
                  </Button>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
