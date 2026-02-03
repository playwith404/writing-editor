"use client"

import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function PaymentPage() {
  const params = useParams<{ projectId: string }>()
  void params.projectId // 페이지 경로상 프로젝트 하위에 있지만, 요금제는 계정 단위입니다.

  const qc = useQueryClient()

  const plansQuery = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: () => api.billing.plans(),
  })
  const plans = useMemo(() => (plansQuery.data ?? []) as any[], [plansQuery.data])

  const subscriptionQuery = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: () => api.billing.subscription(),
  })

  const [error, setError] = useState<string | null>(null)
  const subscribeMutation = useMutation({
    mutationFn: async (plan: "free" | "pro" | "master") => {
      setError(null)
      return api.billing.subscribe({ plan })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["billing", "subscription"] })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "요금제 변경 요청에 실패했습니다."),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">요금제</h2>
        <p className="text-sm text-muted-foreground">
          현재는 결제 연동 전 상태로, Pro/Master는 관리자 승인 방식으로 활성화됩니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">현재 구독</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {subscriptionQuery.isLoading && <div className="text-muted-foreground">불러오는 중...</div>}
          {subscriptionQuery.isError && <div className="text-red-600">구독 정보를 불러오지 못했습니다.</div>}
          {subscriptionQuery.data && (
            <div className="space-y-1">
              <div>
                플랜: <span className="font-medium">{subscriptionQuery.data.plan ?? "free"}</span>
              </div>
              <div className="text-muted-foreground">
                상태: {subscriptionQuery.data.status ?? "none"}
              </div>
              {subscriptionQuery.data.currentPeriodEnd && (
                <div className="text-muted-foreground">
                  종료일: {new Date(subscriptionQuery.data.currentPeriodEnd).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">플랜 선택</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {plansQuery.isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
          {plansQuery.isError && <div className="text-sm text-red-600">플랜 목록을 불러오지 못했습니다.</div>}

          {plans.map((p) => (
            <div key={p.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {p.priceMonthly?.toLocaleString?.() ?? p.priceMonthly} {p.currency}/월
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={subscribeMutation.isPending}
                  onClick={() => subscribeMutation.mutate(p.id)}
                >
                  선택
                </Button>
              </div>
              {Array.isArray(p.features) && p.features.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    {p.features.map((f: any, idx: number) => (
                      <li key={idx}>{String(f)}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}

          {error && <div className="text-sm text-red-600">{error}</div>}
        </CardContent>
      </Card>
    </div>
  )
}
