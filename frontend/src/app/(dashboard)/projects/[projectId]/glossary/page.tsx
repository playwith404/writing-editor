"use client"

import Link from "next/link"
import {
  ArrowRight,
  Globe,
  History,
  Map,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react"
import type { ComponentType } from "react"
import { useEffect, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError } from "@/lib/api"

function CategoryLink({
  href,
  label,
  icon: Icon,
  active = false,
}: {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={active
        ? "inline-flex items-center gap-2 rounded-md bg-[#938274] px-4 py-2 text-sm font-semibold text-white"
        : "inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#6d6155] hover:bg-gray-50"
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}

export default function GlossaryPage({
  params,
}: {
  params: { projectId: string }
}) {
  const projectId = params.projectId
  const queryClient = useQueryClient()

  const projectQuery = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.projects.get(projectId),
    enabled: Boolean(projectId),
  })

  const worldviewsQuery = useQuery({
    queryKey: ["worldviews", projectId],
    queryFn: () => api.worldviews.list(projectId),
    enabled: Boolean(projectId),
  })

  const termWorldview = useMemo(() => {
    const list = worldviewsQuery.data ?? []
    return list.find((w) => w.type === "TERM") ?? null
  }, [worldviewsQuery.data])

  const bootstrapTermWorldview = useMutation({
    mutationFn: async () => {
      return api.worldviews.create(projectId, {
        name: "용어",
        description: "세계관 핵심 용어를 정리합니다.",
        type: "TERM",
        isSynced: true,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["worldviews", projectId] })
    },
  })

  useEffect(() => {
    if (!projectId) return
    if (worldviewsQuery.isLoading || worldviewsQuery.isError) return
    if (termWorldview) return
    if (bootstrapTermWorldview.isPending) return
    bootstrapTermWorldview.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, worldviewsQuery.isLoading, worldviewsQuery.isError, termWorldview])

  const termsQuery = useQuery({
    queryKey: ["worldview-terms", termWorldview?.id],
    queryFn: () => api.worldviews.terms.list(termWorldview!.id),
    enabled: Boolean(termWorldview?.id),
  })

  const terms = useMemo(() => termsQuery.data ?? [], [termsQuery.data])

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-[32px] font-bold text-[#111827]">{projectQuery.data?.title || "프로젝트"} 세계관 - 용어</h1>
        <p className="mt-2 text-lg text-[#7d6f62]">용어를 선택해 상세 정보를 확인해 보세요.</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <CategoryLink href={`/projects/${projectId}`} label="전체 카테고리" icon={Map} />
        <CategoryLink href={`/projects/${projectId}/glossary`} label="용어" icon={Globe} active />
        <CategoryLink href={`/projects/${projectId}/publishing`} label="역사" icon={History} />
        <CategoryLink href={`/projects/${projectId}/planning`} label="관계성" icon={Users} />
        <CategoryLink href={`/projects/${projectId}/magic`} label="마법 체계" icon={Wand2} />
      </div>

      <section className="rounded-3xl border border-[#e2d7c8] bg-[#f9f4ec] p-6">
        <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#7e6f60]">
          <Sparkles className="h-4 w-4" />
          <span>예시 용어</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {termsQuery.isLoading && (
            <div className="rounded-2xl border border-[#ddd2c3] bg-white p-4 text-sm font-semibold text-[#7d6f62]">
              용어를 불러오는 중...
            </div>
          )}
          {termsQuery.isError && (
            <div className="rounded-2xl border border-[#ddd2c3] bg-white p-4 text-sm font-semibold text-[#7d6f62]">
              용어 목록을 불러오지 못했습니다.
            </div>
          )}
          {!termsQuery.isLoading && terms.length === 0 && (
            <div className="rounded-2xl border border-[#ddd2c3] bg-white p-4 text-sm font-semibold text-[#7d6f62]">
              아직 등록된 용어가 없습니다.
            </div>
          )}

          {terms.map((term) => (
            <Link
              key={term.id}
              href={`/projects/${projectId}/glossary/${term.id}`}
              className="rounded-2xl border border-[#ddd2c3] bg-white p-4 shadow-sm transition hover:translate-y-[-1px] hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#1f2937]">{term.term}</h3>
                <span className="rounded-full bg-[#f2e8da] px-2.5 py-1 text-[11px] font-semibold text-[#816f5d]">
                  용어
                </span>
              </div>

              <p className="line-clamp-2 text-sm text-[#7d6f62]">{term.meaning}</p>

              <div className="mt-4 flex items-center justify-between text-xs text-[#9b8d7f]">
                <span>{term.createdAt ? `생성 ${term.createdAt}` : ""}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#8b7c6d]">
                  상세 보기 <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
