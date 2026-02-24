import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Globe, History, Map, Users, Wand2 } from "lucide-react"
import type { ComponentType } from "react"
import { glossaryTerms } from "../glossary-data"

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
  const term = glossaryTerms.find((item) => item.id === termId)

  if (!term) {
    notFound()
  }

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

      <div className="flex flex-wrap gap-3">
        <CategoryLink href={`/projects/${projectId}`} label="전체 카테고리" icon={Map} />
        <CategoryLink href={`/projects/${projectId}/glossary`} label="용어" icon={Globe} active />
        <CategoryLink href={`/projects/${projectId}/publishing`} label="역사" icon={History} />
        <CategoryLink href={`/projects/${projectId}/planning`} label="관계성" icon={Users} />
        <CategoryLink href={`/projects/${projectId}/magic`} label="마법 체계" icon={Wand2} />
      </div>

      <article className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <section className="rounded-3xl border border-[#e2d7c8] bg-white p-8">
          <p className="text-sm font-semibold text-[#9b8d7f]">{term.category}</p>
          <h1 className="mt-1 text-4xl font-bold text-[#111827]">{term.term}</h1>
          <p className="mt-4 text-lg leading-8 text-[#5f5347]">{term.definition}</p>

          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-sm font-bold tracking-wide text-[#8b7b69]">어원/배경</h2>
              <p className="mt-2 text-[15px] leading-7 text-[#6d6155]">{term.origin}</p>
            </div>

            <div>
              <h2 className="text-sm font-bold tracking-wide text-[#8b7b69]">사용 예시</h2>
              <p className="mt-2 rounded-2xl border border-[#e8dece] bg-[#f9f4ec] p-4 text-[15px] leading-7 text-[#6d6155]">
                {term.example}
              </p>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#e2d7c8] bg-[#f9f4ec] p-4">
            <h3 className="text-xs font-bold tracking-wide text-[#8f7e6c]">관련 용어</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {term.related.map((item) => (
                <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6d6155]">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e2d7c8] bg-[#f9f4ec] p-4">
            <h3 className="text-xs font-bold tracking-wide text-[#8f7e6c]">최근 수정</h3>
            <p className="mt-2 text-sm text-[#6d6155]">{term.updatedAt}</p>
          </div>
        </aside>
      </article>
    </div>
  )
}
