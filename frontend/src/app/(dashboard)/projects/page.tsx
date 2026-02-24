"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import {
  BookOpen,
  Clock,
  MoreHorizontal,
  PenLine,
  PenTool,
  Plus,
  Search,
  SquarePen,
  X,
} from "lucide-react"

type Project = {
  id: string
  title: string
  description?: string
  genre?: string
  wordCount?: number
  updatedAt?: string
}

const mockProjects: Project[] = [
  {
    id: "magilcho-jeon",
    title: "나의 삶 시리즈",
    description: "등대는 홀로 서있는 파수꾼처럼 다가오는 안개 속에서 빛을 발하며...",
    genre: "NOVEL",
    wordCount: 15420,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "project-mock-2",
    title: "파이썬 학습일지",
    description: "파이썬의 기초부터 데이터 분석까지 기록하는 나만의 학습 가이드입니다.",
    genre: "TECHNOLOGY",
    wordCount: 8200,
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

function formatEditedAt(iso?: string) {
  if (!iso) return "just now"
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(1, Math.floor(diff / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days} days ago`
}

function progressFromWords(wordCount?: number) {
  const words = Number(wordCount ?? 0)
  if (!Number.isFinite(words) || words <= 0) return 8
  return Math.max(8, Math.min(95, Math.round(words / 500)))
}

function badgeStyle(genre?: string) {
  const key = (genre ?? "").toLowerCase()
  if (key.includes("tech")) return { label: "TECHNOLOGY", className: "bg-[#edf5ef] text-[#4f7a5e]" }
  if (key.includes("sf")) return { label: "SF", className: "bg-[#f1ece5] text-[#6f6153]" }
  return { label: genre?.toUpperCase() || "NOVEL", className: "bg-[#f3eee7] text-[#8a7a6a]" }
}

function ProjectCard({ project }: { project: Project }) {
  const badge = badgeStyle(project.genre)
  const progress = progressFromWords(project.wordCount)

  return (
    <Link href={`/projects/${project.id}`} className="block">
      <div className="flex h-[240px] cursor-pointer flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition duration-200 hover:shadow-md">
        <div className="mb-4 flex items-start justify-between">
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${badge.className}`}>
            {badge.label}
          </span>
          <MoreHorizontal className="h-5 w-5 text-gray-300 transition hover:text-gray-500" />
        </div>

        <h3 className="mb-2 text-xl font-bold text-gray-900">{project.title}</h3>
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-gray-400">
          {project.description || "설명을 입력해 프로젝트 방향을 정리해 보세요."}
        </p>

        <div className="mt-auto">
          <div className="mb-1.5 flex justify-between text-[11px] font-medium text-gray-400">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mb-3 h-1.5 w-full rounded-full bg-gray-100">
            <div className="h-1.5 rounded-full bg-[#938274]" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Edited {formatEditedAt(project.updatedAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function EmptyCard({ text, onClick }: { text: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ddd4c8] bg-transparent transition hover:border-[#c8bbab] hover:bg-white"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f3eee7] text-[#8b7d6f] transition group-hover:bg-[#ebe3d8]">
        <Plus className="h-6 w-6" />
      </div>
      <span className="text-sm font-semibold text-[#7b6f62] transition group-hover:text-[#665b50]">{text}</span>
    </button>
  )
}

function ModeSelectionModal({
  open,
  onClose,
  onWriterMode,
  onNormalMode,
}: {
  open: boolean
  onClose: () => void
  onWriterMode: () => void
  onNormalMode: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#d8cec1]/70 p-5 backdrop-blur-sm">
      <div className="w-full max-w-[860px] rounded-[28px] border border-white/60 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.2)] md:p-10">
        <div className="flex items-start justify-between">
          <div className="text-center md:flex-1">
            <h3 className="text-4xl font-bold text-[#1f2937]">새 작품 집필하기</h3>
            <p className="mt-2 text-2xl font-semibold text-[#8b7d6f]">편집 모드 선택</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#a39282] transition hover:bg-gray-100 hover:text-[#7e6f60]"
            aria-label="close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#e3dbd0] p-6">
            <div className="mb-4 inline-flex rounded-xl bg-[#f3eee7] p-3 text-[#8f7f6f]">
              <PenTool className="h-5 w-5" />
            </div>
            <h4 className="text-xl font-bold text-[#1f2937]">작가 모드</h4>
            <p className="mt-3 text-sm leading-7 text-[#64748b]">
              AI 어시스턴트, 플롯 관리, 캐릭터 트래킹 기능을 통해
              서사 흐름에 집중할 수 있는 집필 전용 환경입니다.
            </p>
            <button
              type="button"
              onClick={onWriterMode}
              className="mt-6 inline-flex items-center gap-2 text-base font-semibold text-[#8f7f6f] transition hover:text-[#7b6c5e]"
            >
              시작하기
              <span aria-hidden>→</span>
            </button>
          </div>

          <div className="rounded-2xl border border-[#e8ddd2] p-6">
            <div className="mb-4 inline-flex rounded-xl bg-[#fff1e7] p-3 text-[#f97316]">
              <SquarePen className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <h4 className="text-xl font-bold text-[#1f2937]">일반 모드</h4>
              <span className="text-sm font-semibold text-[#9e8e7d]">beta</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-[#64748b]">
              개발자 노트, 심플 레포트, 일반 문서 작업 등
              다목적 편집에 최적화된 깔끔한 문서 환경입니다.
            </p>
            <button
              type="button"
              onClick={onNormalMode}
              className="mt-6 inline-flex items-center gap-2 text-base font-semibold text-[#f97316] transition hover:text-[#ea580c]"
            >
              시작하기
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-[#9a8d7f]">설정한 모드는 변경할 수 없습니다.</p>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const [modeOpen, setModeOpen] = useState(false)
  const projects = mockProjects

  const recentProjects = projects.slice(0, 2)
  const templateProjects = projects.slice(0, 1)
  const defaultProjectId = useMemo(() => projects[0]?.id ?? "magilcho-jeon", [projects])

  const openWriterMode = () => {
    setModeOpen(false)
    router.push(`/projects/${defaultProjectId}`)
  }

  const openNormalMode = () => {
    setModeOpen(false)
    router.push(`/${defaultProjectId}`)
  }

  return (
    <div className="relative -mx-6 bg-[#fdfbf7] px-6 py-8 md:-mx-10 md:px-10">
      <ModeSelectionModal
        open={modeOpen}
        onClose={() => setModeOpen(false)}
        onWriterMode={openWriterMode}
        onNormalMode={openNormalMode}
      />

      <div className="mx-auto max-w-5xl">
        <div className="mb-12">
          <h1 className="text-3xl font-bold leading-tight text-[#1f2937] md:text-[42px]">좋은 아침입니다, 길초 님.</h1>
          <p className="text-2xl font-light text-[#a09080] md:text-[42px]">어떤 작품을 집필해 볼까요?</p>
        </div>

        <div className="mb-16 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => {
              setModeOpen(true)
            }}
            className="flex items-center gap-2 rounded-2xl bg-[#938274] px-7 py-3 font-semibold text-white shadow-[0_10px_18px_rgba(147,130,116,0.25)] transition hover:-translate-y-0.5 hover:bg-[#837365]"
          >
            <Plus className="h-5 w-5" />
            <span>새 작품 집필하기</span>
          </button>
          <button className="flex items-center gap-2 rounded-2xl border border-[#d8cec3] bg-white px-7 py-3 font-semibold text-[#726658] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#faf6f1]">
            <Search className="h-5 w-5" />
            <span>템플릿 보기</span>
          </button>
        </div>

        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[17px] font-bold text-[#7b6f62]">
              <BookOpen className="h-5 w-5 text-[#8f7f6f]" />
              <h2>최근 내 작업물</h2>
            </div>
            <Link href="/projects" className="text-sm font-semibold text-[#9b8d7f] transition hover:text-[#8b7a6c]">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
            <EmptyCard
              text="새 작품 집필하기"
              onClick={() => {
                setModeOpen(true)
              }}
            />
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[17px] font-bold text-[#7b6f62]">
              <PenLine className="h-5 w-5 text-[#8f7f6f]" />
              <h2>저장한 템플릿</h2>
            </div>
            <Link href="/projects" className="text-sm font-semibold text-[#9b8d7f] transition hover:text-[#8b7a6c]">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templateProjects.map((project) => (
              <ProjectCard key={`template-${project.id}`} project={{ ...project, title: `템플릿 · ${project.title}` }} />
            ))}
            <EmptyCard text="더 많은 템플릿 찾아보기" />
          </div>
        </section>
      </div>
    </div>
  )
}
