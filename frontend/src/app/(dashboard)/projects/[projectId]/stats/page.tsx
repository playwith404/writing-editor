"use client"

import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
      </Tabs>
    </div>
  )
}
