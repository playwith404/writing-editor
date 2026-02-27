"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ComponentType, FormEvent } from "react"
import {
  ArrowRight,
  Globe,
  History,
  Menu,
  Plus,
  Users,
  Wand2,
  X,
} from "lucide-react"
import { api } from "@/lib/api"

type CategoryCardProps = {
  href: string
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  entries: string
  category: WorldCategory
}

type WorldCategory = "glossary" | "history" | "relationships" | "magic"
type FilterValue = "all" | WorldCategory

type FilterButtonProps = {
  icon: ComponentType<{ className?: string }>
  text: string
  active?: boolean
  onClick?: () => void
}

const baseCards: CategoryCardProps[] = [
  {
    href: "",
    icon: Globe,
    title: "용어",
    description: "Maps, regions, climate data, and biomes.",
    entries: "14 ENTRIES",
    category: "glossary",
  },
  {
    href: "",
    icon: History,
    title: "시간 흐름",
    description: "Eras, timelines, and pivotal world events.",
    entries: "28 ENTRIES",
    category: "history",
  },
  {
    href: "",
    icon: Users,
    title: "관계성",
    description: "Cultures, politics, language, and religion.",
    entries: "42 ENTRIES",
    category: "relationships",
  },
  {
    href: "",
    icon: Wand2,
    title: "마법 체계",
    description: "Rules, power sources, and limitations.",
    entries: "12 ENTRIES",
    category: "magic",
  },
]

function FilterButton({ icon: Icon, text, active = false, onClick }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active
        ? "flex items-center gap-2 rounded-md bg-[#938274] px-4 py-2 text-sm font-medium text-white shadow-sm"
        : "flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
      }
    >
      <Icon className="h-4 w-4" />
      <span>{text}</span>
    </button>
  )
}

function CategoryCard({ icon: Icon, title, description, entries, href }: CategoryCardProps) {
  return (
    <Link
      href={href}
      className="flex h-[280px] cursor-pointer flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] transition duration-200 hover:shadow-md"
    >
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-lg bg-[#faf9f7]">
        <Icon className="h-8 w-8 text-[#938274]" />
      </div>
      <h3 className="mb-2 text-[17px] font-bold text-gray-900">{title}</h3>
      <p className="flex-1 text-sm leading-relaxed text-gray-500">{description}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#9b8d80]">{entries}</span>
        <ArrowRight className="h-4 w-4 text-gray-300" />
      </div>
    </Link>
  )
}

function NewSettingModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (payload: { title: string; description: string; category: WorldCategory }) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<WorldCategory>("glossary")

  if (!open) return null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !description.trim()) return
    onCreate({ title: title.trim(), description: description.trim(), category })
    setTitle("")
    setDescription("")
    setCategory("glossary")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-[#ddd4c8] bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold text-[#111827]">새로운 설정 추가</h3>
            <p className="mt-2 text-sm text-[#7d6f62]">카테고리 카드를 프론트에서 즉시 추가합니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#9a8d7f] hover:bg-[#fdfbf7]"
            aria-label="close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#334155]">카드 제목</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 종족 설정"
              className="h-11 w-full rounded-xl border border-[#d8cec3] px-3 text-sm outline-none transition focus:border-[#938274]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#334155]">설명</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="카드 설명을 입력하세요."
              className="w-full rounded-xl border border-[#d8cec3] px-3 py-2 text-sm outline-none transition focus:border-[#938274]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#334155]">카테고리</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as WorldCategory)}
              className="h-11 w-full rounded-xl border border-[#d8cec3] px-3 text-sm outline-none transition focus:border-[#938274]"
            >
              <option value="glossary">용어</option>
              <option value="history">역사</option>
              <option value="relationships">관계성</option>
              <option value="magic">마법 체계</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#d8cec3] px-4 py-2 text-sm font-semibold text-[#7d6f62] hover:bg-[#faf6f1]"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#938274] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7f6f60]"
            >
              추가하기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectDashboardPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const projectQuery = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.projects.get(projectId),
    enabled: Boolean(projectId),
  })

  const projectTitle = projectQuery.data?.title || "프로젝트"
  const [filter, setFilter] = useState<FilterValue>("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customCards, setCustomCards] = useState<CategoryCardProps[]>([])

  const cards = useMemo(() => {
    const initial = baseCards.map((card) => ({
      ...card,
      href:
        card.category === "history"
          ? `/projects/${projectId}/publishing`
          : card.category === "relationships"
            ? `/projects/${projectId}/planning`
            : card.category === "magic"
              ? `/projects/${projectId}/magic`
              : `/projects/${projectId}/glossary`,
    }))

    return [...initial, ...customCards]
  }, [customCards, projectId])

  const filteredCards = useMemo(() => {
    if (filter === "all") return cards
    return cards.filter((card) => card.category === filter)
  }, [cards, filter])

  const addCard = (payload: { title: string; description: string; category: WorldCategory }) => {
    const iconByCategory: Record<WorldCategory, ComponentType<{ className?: string }>> = {
      glossary: Globe,
      history: History,
      relationships: Users,
      magic: Wand2,
    }

    const routeByCategory: Record<WorldCategory, string> = {
      glossary: `/projects/${projectId}/glossary`,
      history: `/projects/${projectId}/publishing`,
      relationships: `/projects/${projectId}/planning`,
      magic: `/projects/${projectId}/magic`,
    }

    setCustomCards((prev) => [
      ...prev,
      {
        href: routeByCategory[payload.category],
        icon: iconByCategory[payload.category],
        title: payload.title,
        description: payload.description,
        entries: "0 ENTRIES",
        category: payload.category,
      },
    ])
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-8">
      <NewSettingModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={addCard} />

      <div>
        <h2 className="mb-2 text-[28px] font-bold text-gray-900">{projectTitle} 세계관</h2>
        <p className="text-gray-500">나의 세계관을 자유롭게 커스텀해 볼까요? 🪄</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <FilterButton icon={Menu} text="All Categories" active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterButton icon={Globe} text="용어" active={filter === "glossary"} onClick={() => setFilter("glossary")} />
        <FilterButton icon={History} text="역사" active={filter === "history"} onClick={() => setFilter("history")} />
        <FilterButton icon={Users} text="관계성" active={filter === "relationships"} onClick={() => setFilter("relationships")} />
        <FilterButton icon={Wand2} text="마법 체계" active={filter === "magic"} onClick={() => setFilter("magic")} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {filteredCards.map((card) => (
          <CategoryCard key={`${card.title}-${card.category}`} {...card} />
        ))}

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="group flex h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-transparent transition hover:bg-gray-50"
        >
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#f3eee7] text-[#8f7f6f] transition group-hover:bg-[#ebe3d8]">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-gray-500">새로운 설정 추가하기</span>
        </button>
      </div>
    </div>
  )
}
