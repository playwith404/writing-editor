"use client"

import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, ApiError } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

function pct(current: number, target: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)))
}

function ProgressBar({ value }: { value: number }) {
  const w = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div className="h-2 bg-primary" style={{ width: `${w}%` }} />
    </div>
  )
}

export default function ProjectStatsPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const [days, setDays] = useState(14)

  const summaryQuery = useQuery({
    queryKey: ["stats", "project", projectId],
    queryFn: () => api.stats.project(projectId),
  })

  const dailyQuery = useQuery({
    queryKey: ["stats", "dailyWords", projectId, days],
    queryFn: () => api.stats.dailyWords(projectId, days),
  })

  const rows = useMemo(() => ((dailyQuery.data?.series ?? []) as any[]), [dailyQuery.data?.series])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">스탯</h2>
        <p className="text-sm text-muted-foreground">집필 진행률과 일별 글자 수를 확인합니다.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">문서</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summaryQuery.data?.documents ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">플롯</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summaryQuery.data?.plots ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">총 단어</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {Number(summaryQuery.data?.wordCount ?? 0).toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">기간</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>최근 7일</option>
              <option value={14}>최근 14일</option>
              <option value={30}>최근 30일</option>
              <option value={90}>최근 90일</option>
            </select>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">일별 단어</TabsTrigger>
          <TabsTrigger value="goals">목표</TabsTrigger>
          <TabsTrigger value="character">캐릭터 스탯</TabsTrigger>
        </TabsList>
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">일별 단어 변화</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {dailyQuery.isLoading && <div className="text-muted-foreground">불러오는 중...</div>}
              {dailyQuery.isError && <div className="text-red-600">통계를 불러오지 못했습니다.</div>}
              {!dailyQuery.isLoading && rows.length === 0 && (
                <div className="text-muted-foreground">표시할 데이터가 없습니다.</div>
              )}
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.date} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="text-muted-foreground">{String(r.date)}</div>
                    <div className="font-medium">{Number(r.wordsDelta ?? 0).toLocaleString()} 단어</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <GoalsTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="character">
          <CharacterStatsTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function goalTypeLabel(goalType?: string) {
  const key = (goalType ?? "").toLowerCase()
  if (key === "daily") return "일일 목표"
  if (key === "weekly") return "주간 목표"
  if (key === "project") return "프로젝트 목표"
  return goalType || "목표"
}

function GoalsTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient()

  const goalsQuery = useQuery({
    queryKey: ["writingGoals", projectId],
    queryFn: () => api.writingGoals.list(projectId),
  })

  const goals = useMemo(() => (goalsQuery.data ?? []) as any[], [goalsQuery.data])
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = useMemo(() => goals.find((g) => String(g.id) === String(editingId)), [goals, editingId])

  const [goalType, setGoalType] = useState("daily")
  const [targetWords, setTargetWords] = useState("1000")
  const [dueDate, setDueDate] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) return
    setGoalType(editing.goalType ?? "daily")
    setTargetWords(String(editing.targetWords ?? "1000"))
    setDueDate(editing.dueDate ?? "")
    setError(null)
  }, [editing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const createGoal = useMutation({
    mutationFn: async () => {
      setError(null)
      return api.writingGoals.create({
        projectId,
        goalType,
        targetWords: Number(targetWords || 0),
        dueDate: dueDate || null,
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["writingGoals", projectId] })
      setEditingId(null)
      setGoalType("daily")
      setTargetWords("1000")
      setDueDate("")
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "목표 생성에 실패했습니다."),
  })

  const updateGoal = useMutation({
    mutationFn: async () => {
      if (!editingId) return null
      setError(null)
      return api.writingGoals.update(editingId, {
        goalType,
        targetWords: Number(targetWords || 0),
        dueDate: dueDate || null,
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["writingGoals", projectId] })
      setEditingId(null)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "목표 수정에 실패했습니다."),
  })

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => api.writingGoals.delete(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["writingGoals", projectId] })
      setEditingId(null)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "목표 삭제에 실패했습니다."),
  })

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">목표 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">목표 유형</div>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="daily">일일 목표</option>
                <option value="weekly">주간 목표</option>
                <option value="project">프로젝트 목표</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">목표 단어 수</div>
              <Input value={targetWords} onChange={(e) => setTargetWords(e.target.value)} placeholder="예) 50000" />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">마감일(선택)</div>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center gap-2">
            <Button
              disabled={createGoal.isPending || updateGoal.isPending || !Number(targetWords || 0)}
              onClick={() => (editingId ? updateGoal.mutate() : createGoal.mutate())}
            >
              {editingId ? (updateGoal.isPending ? "저장 중..." : "목표 저장") : (createGoal.isPending ? "생성 중..." : "목표 생성")}
            </Button>
            <Button variant="outline" disabled={!editingId} onClick={() => setEditingId(null)}>
              새 목표
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">등록된 목표</div>
            {goalsQuery.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
            {goalsQuery.isError && <div className="text-sm text-red-600">목표를 불러오지 못했습니다.</div>}
            {!goalsQuery.isLoading && goals.length === 0 && (
              <div className="text-sm text-muted-foreground">아직 목표가 없습니다.</div>
            )}
            {goals.map((g) => {
              const current = Number(g.currentWords ?? 0)
              const target = Number(g.targetWords ?? 0)
              const p = pct(current, target)
              return (
                <button
                  key={g.id}
                  onClick={() => setEditingId(String(g.id))}
                  className={`w-full text-left rounded-lg border p-3 hover:bg-muted/30 ${String(editingId) === String(g.id) ? "border-primary" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{goalTypeLabel(g.goalType)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {current.toLocaleString()} / {target.toLocaleString()} 단어 {g.dueDate ? `· 마감 ${g.dueDate}` : ""}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={deleteGoal.isPending}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!confirm("이 목표를 삭제할까요?")) return
                        deleteGoal.mutate(String(g.id))
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                  <div className="mt-2 space-y-1">
                    <ProgressBar value={p} />
                    <div className="text-xs text-muted-foreground">{p}%</div>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">진행 요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="text-muted-foreground">
            현재 프로젝트 총 단어 수 기준으로 목표의 진행률을 계산합니다.
          </div>
          {goals.length > 0 ? (
            <div className="space-y-2">
              {goals.map((g) => {
                const current = Number(g.currentWords ?? 0)
                const target = Number(g.targetWords ?? 0)
                const p = pct(current, target)
                return (
                  <div key={g.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{goalTypeLabel(g.goalType)}</div>
                      <div className="text-xs text-muted-foreground">{p}%</div>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={p} />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {current.toLocaleString()} / {target.toLocaleString()} 단어
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-muted-foreground">왼쪽에서 목표를 추가하세요.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CharacterStatsTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient()

  const charactersQuery = useQuery({
    queryKey: ["characters", projectId],
    queryFn: () => api.characters.list(projectId),
  })
  const characters = useMemo(() => (charactersQuery.data ?? []) as any[], [charactersQuery.data])

  const templatesQuery = useQuery({
    queryKey: ["characterStats", "templates"],
    queryFn: () => api.characterStats.templates(),
  })
  const templates = useMemo(() => (templatesQuery.data ?? []) as any[], [templatesQuery.data])

  const [characterId, setCharacterId] = useState<string>("")
  const [templateType, setTemplateType] = useState<string>("rpg")
  const [episodeNum, setEpisodeNum] = useState<string>("")

  const [raw, setRaw] = useState<Record<string, any>>({ str: 10, dex: 10, int: 10, vit: 10, level: 1, exp: 0 })
  const [computed, setComputed] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const statsQuery = useQuery({
    queryKey: ["characterStats", "list", characterId],
    queryFn: () => api.characterStats.list(characterId),
    enabled: Boolean(characterId),
  })
  const rows = useMemo(() => (statsQuery.data ?? []) as any[], [statsQuery.data])

  const consistencyQuery = useQuery({
    queryKey: ["characterStats", "consistency", characterId],
    queryFn: () => api.characterStats.consistency(characterId),
    enabled: Boolean(characterId),
  })
  const issues = useMemo(() => (consistencyQuery.data ?? []) as any[], [consistencyQuery.data])

  const calculate = useMutation({
    mutationFn: async () => {
      setError(null)
      return api.characterStats.calculate({ templateType, stats: raw })
    },
    onSuccess: (res: any) => {
      setComputed(res ?? null)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "계산에 실패했습니다."),
  })

  const save = useMutation({
    mutationFn: async () => {
      if (!characterId) return null
      setError(null)
      const statsPayload = computed ?? raw
      return api.characterStats.create({
        characterId,
        templateType,
        episodeNum: episodeNum ? Number(episodeNum) : null,
        stats: statsPayload,
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["characterStats", "list", characterId] })
      await qc.invalidateQueries({ queryKey: ["characterStats", "consistency", characterId] })
      setEpisodeNum("")
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "저장에 실패했습니다."),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => api.characterStats.delete(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["characterStats", "list", characterId] })
      await qc.invalidateQueries({ queryKey: ["characterStats", "consistency", characterId] })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "삭제에 실패했습니다."),
  })

  useEffect(() => {
    if (!characterId) return
    setComputed(null)
    setError(null)
  }, [characterId])

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">캐릭터 스탯 입력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">캐릭터</div>
              <select
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">선택...</option>
                {characters.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {String(c.name || "이름 없음")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">템플릿</div>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              >
                {templates.length === 0 && <option value="rpg">게임판타지(RPG)</option>}
                {templates.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {String(t.name || t.id)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">회차(선택)</div>
              <Input value={episodeNum} onChange={(e) => setEpisodeNum(e.target.value)} placeholder="예) 12" />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            {["str", "dex", "int", "vit", "level", "exp"].map((k) => (
              <div key={k} className="space-y-1">
                <div className="text-xs text-muted-foreground">{k.toUpperCase()}</div>
                <Input
                  value={String(raw[k] ?? "")}
                  onChange={(e) => setRaw((p) => ({ ...p, [k]: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center gap-2">
            <Button disabled={!characterId || calculate.isPending} onClick={() => calculate.mutate()}>
              {calculate.isPending ? "계산 중..." : "자동 계산"}
            </Button>
            <Button variant="secondary" disabled={!characterId || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "저장 중..." : "기록 저장"}
            </Button>
          </div>

          {computed && (
            <div className="rounded-lg border p-3 bg-muted/20 text-sm">
              <div className="font-medium mb-2">계산 결과</div>
              <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(computed, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!characterId && <div className="text-muted-foreground">캐릭터를 선택하세요.</div>}
            {characterId && statsQuery.isLoading && <div className="text-muted-foreground">불러오는 중...</div>}
            {characterId && statsQuery.isError && <div className="text-red-600">기록을 불러오지 못했습니다.</div>}
            {characterId && !statsQuery.isLoading && rows.length === 0 && (
              <div className="text-muted-foreground">아직 기록이 없습니다.</div>
            )}
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">
                        {r.episodeNum ? `회차 ${r.episodeNum}` : "기록"} {r.createdAt ? `· ${new Date(r.createdAt).toLocaleString()}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {r.templateType || templateType}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (!confirm("이 기록을 삭제할까요?")) return
                        remove.mutate(String(r.id))
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                  {r.stats && (
                    <pre className="mt-2 whitespace-pre-wrap text-xs bg-muted/20 rounded border p-2">
                      {JSON.stringify(r.stats, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">일관성 체크</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!characterId && <div className="text-muted-foreground">캐릭터를 선택하세요.</div>}
            {characterId && consistencyQuery.isLoading && <div className="text-muted-foreground">검사 중...</div>}
            {characterId && consistencyQuery.isError && <div className="text-red-600">검사 결과를 불러오지 못했습니다.</div>}
            {characterId && !consistencyQuery.isLoading && issues.length === 0 && (
              <div className="text-muted-foreground">특이사항이 없습니다.</div>
            )}
            <div className="space-y-2">
              {issues.map((it: any, idx: number) => (
                <div key={`${it.id ?? idx}-${it.field ?? ""}`} className="rounded-md border px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-sm">
                      {(it.severity === "error" ? "오류" : "경고")} {it.episodeNum ? `· 회차 ${it.episodeNum}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">{it.field}</div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{it.message}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
