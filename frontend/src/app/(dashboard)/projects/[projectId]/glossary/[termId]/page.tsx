"use client"

import Link from "next/link"
import { ArrowLeft, Globe, History, Map, Users, Wand2 } from "lucide-react"
import type { ComponentType } from "react"
import { useEffect, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

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

export default function GlossaryTermDetailPage({
  params,
}: {
  params: { projectId: string; termId: string }
}) {
  const { projectId, termId } = params
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

  const term = useMemo(() => (termsQuery.data ?? []).find((item) => item.id === termId) ?? null, [termsQuery.data, termId])

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Link
          href={`/projects/${projectId}/glossary`}
          className="inline-flex items-center gap-1 rounded-lg border border-[#d8cec3] bg-white px-3 py-1.5 text-sm font-semibold text-[#7b6e61] hover:bg-[#faf6f1]"
        >
          <ArrowLeft className="h-4 w-4" />
          용어 목록
        </Link>
      </div>

      {termsQuery.isLoading && (
        <div className="rounded-2xl border border-[#e2d7c8] bg-white p-6 text-sm font-semibold text-[#7d6f62]">
          용어를 불러오는 중...
        </div>
      )}

      {!termsQuery.isLoading && !term && (
        <div className="rounded-2xl border border-[#e2d7c8] bg-white p-6 text-sm font-semibold text-[#7d6f62]">
          용어를 찾을 수 없습니다.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <CategoryLink href={`/projects/${projectId}`} label="전체 카테고리" icon={Map} />
        <CategoryLink href={`/projects/${projectId}/glossary`} label="용어" icon={Globe} active />
        <CategoryLink href={`/projects/${projectId}/publishing`} label="역사" icon={History} />
        <CategoryLink href={`/projects/${projectId}/planning`} label="관계성" icon={Users} />
        <CategoryLink href={`/projects/${projectId}/magic`} label="마법 체계" icon={Wand2} />
      </div>

      {term && (
        <article className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <section className="rounded-3xl border border-[#e2d7c8] bg-white p-8">
          <p className="text-sm font-semibold text-[#9b8d7f]">용어</p>
          <h1 className="mt-1 text-4xl font-bold text-[#111827]">{term.term}</h1>
          <p className="mt-4 text-lg leading-8 text-[#5f5347]">{term.meaning}</p>

          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-sm font-bold tracking-wide text-[#8b7b69]">어원/배경</h2>
              <p className="mt-2 text-[15px] leading-7 text-[#6d6155]">준비 중입니다.</p>
            </div>

            <div>
              <h2 className="text-sm font-bold tracking-wide text-[#8b7b69]">사용 예시</h2>
              <p className="mt-2 rounded-2xl border border-[#e8dece] bg-[#f9f4ec] p-4 text-[15px] leading-7 text-[#6d6155]">
                준비 중입니다.
              </p>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#e2d7c8] bg-[#f9f4ec] p-4">
            <h3 className="text-xs font-bold tracking-wide text-[#8f7e6c]">관련 용어</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6d6155]">준비 중</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e2d7c8] bg-[#f9f4ec] p-4">
            <h3 className="text-xs font-bold tracking-wide text-[#8f7e6c]">최근 수정</h3>
            <p className="mt-2 text-sm text-[#6d6155]">{term.createdAt || "-"}</p>
          </div>
        </aside>
      </article>
      )}
    </div>
  )
}
