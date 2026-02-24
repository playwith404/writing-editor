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
import { glossaryTerms } from "./glossary-data"

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

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-[32px] font-bold text-[#111827]">마길초전 세계관 - 용어</h1>
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
          {glossaryTerms.map((term) => (
            <Link
              key={term.id}
              href={`/projects/${projectId}/glossary/${term.id}`}
              className="rounded-2xl border border-[#ddd2c3] bg-white p-4 shadow-sm transition hover:translate-y-[-1px] hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#1f2937]">{term.term}</h3>
                <span className="rounded-full bg-[#f2e8da] px-2.5 py-1 text-[11px] font-semibold text-[#816f5d]">
                  {term.category}
                </span>
              </div>

              <p className="line-clamp-2 text-sm text-[#7d6f62]">{term.summary}</p>

              <div className="mt-4 flex items-center justify-between text-xs text-[#9b8d7f]">
                <span>최근 수정 {term.updatedAt}</span>
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
