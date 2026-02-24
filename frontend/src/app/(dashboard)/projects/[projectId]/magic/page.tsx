"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import type { ComponentType } from "react"
import {
  ArrowRight,
  Globe,
  History,
  Menu,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react"

type RuleCardProps = {
  icon: ComponentType<{ className?: string }>
  title: string
  summary: string
  status: string
}

function CategoryLink({
  icon: Icon,
  label,
  href,
  active = false,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  href: string
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

function RuleCard({ icon: Icon, title, summary, status }: RuleCardProps) {
  return (
    <button
      type="button"
      className="flex min-h-[250px] cursor-pointer flex-col rounded-2xl border border-[#d9e2ee] bg-white p-6 text-left shadow-sm transition hover:shadow-md"
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-[#faf6f1]">
        <Icon className="h-8 w-8 text-[#938274]" />
      </div>
      <h3 className="text-xl font-bold text-[#1f2937]">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-[#7d6f62]">{summary}</p>
      <div className="mt-4 flex items-center justify-between text-xs font-bold text-[#8da0b8]">
        <span>{status}</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  )
}

export default function MagicSystemPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-[32px] font-bold text-[#111827]">마길초전 세계관 - 마법 체계</h2>
        <p className="text-xl text-[#7d6f62]">마법 사용 규칙과 부작용을 한눈에 관리해 볼까요?</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <CategoryLink icon={Menu} label="All Categories" href={`/projects/${projectId}`} />
        <CategoryLink icon={Globe} label="용어" href={`/projects/${projectId}/glossary`} />
        <CategoryLink icon={History} label="역사" href={`/projects/${projectId}/publishing`} />
        <CategoryLink icon={Users} label="관계성" href={`/projects/${projectId}/planning`} />
        <CategoryLink icon={Wand2} label="마법 체계" href={`/projects/${projectId}/magic`} active />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <RuleCard
          icon={Sparkles}
          title="원천 설정"
          summary="마력의 근원, 속성 분류, 각 속성별 상성 규칙을 정의합니다."
          status="8 RULES"
        />
        <RuleCard
          icon={Wand2}
          title="사용 제약"
          summary="시전 조건, 부작용, 금지 주문과 페널티를 체계적으로 정리합니다."
          status="12 RULES"
        />
        <RuleCard
          icon={Users}
          title="마법 사용자"
          summary="인물별 각성 단계, 소속 세력, 마법 적성 스펙을 연결합니다."
          status="5 PROFILES"
        />
      </div>
    </div>
  )
}
