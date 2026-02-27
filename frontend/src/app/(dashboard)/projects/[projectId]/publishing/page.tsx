"use client"

import { useParams } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Download,
  Link2,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { api } from "@/lib/api"

type ActKey = "act1" | "act2" | "act3"

type Scene = {
  id: string
  beat: string
  title: string
  description: string
  words: number
  linked: string
  done: boolean
}

const initialScenes: Record<ActKey, Scene[]> = {
  act1: [
    {
      id: "act1-scene1",
      beat: "BEAT 01",
      title: "주인공의 일상",
      description: "마길초의 일상과 주변 인물의 기본 관계를 소개한다.",
      words: 860,
      linked: "연결된 회차: 프롤로그",
      done: true,
    },
    {
      id: "act1-scene2",
      beat: "BEAT 02",
      title: "사건의 시작",
      description: "평온하던 흐름이 무너지며 갈등의 전조가 시작된다.",
      words: 920,
      linked: "연결된 회차: 1화",
      done: true,
    },
  ],
  act2: [
    {
      id: "act2-scene4",
      beat: "BEAT 04",
      title: "취업을 한 마길초",
      description: "마길초는 면량 청인의 회사에 취직을 했다.",
      words: 1200,
      linked: "연결된 회차: 마길초전 1",
      done: true,
    },
    {
      id: "act2-scene5",
      beat: "BEAT 05 (ACTIVE)",
      title: "회사의 정체",
      description: "고층빌딩 외벽을 청소하는 일을 하게 된 마길초였다.",
      words: 1200,
      linked: "연결된 회차: 마길초전 2",
      done: true,
    },
    {
      id: "act2-scene6",
      beat: "BEAT 06",
      title: "일을 하는 마길초",
      description: "마길초는 누구보다 열심히 일을 했다.",
      words: 900,
      linked: "연결된 회차가 없습니다.",
      done: false,
    },
  ],
  act3: [
    {
      id: "act3-scene1",
      beat: "BEAT 07",
      title: "진실과 대면",
      description: "숨겨진 정체가 드러나고 인물들의 선택이 갈라진다.",
      words: 1400,
      linked: "연결된 회차: 10화",
      done: false,
    },
  ],
}

function AddSceneModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (scene: { beat: string; title: string; description: string; linked: string }) => void
}) {
  const [beat, setBeat] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [linked, setLinked] = useState("")

  if (!open) return null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return

    onCreate({
      beat: beat.trim() || "BEAT NEW",
      title: title.trim(),
      description: description.trim() || "새로운 플롯 포인트 설명을 입력해 주세요.",
      linked: linked.trim() || "연결된 회차가 없습니다.",
    })

    setBeat("")
    setTitle("")
    setDescription("")
    setLinked("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-[#ddd4c8] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#111827]">New Plot Point</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#9a8d7f] hover:bg-[#f8f4ee]" aria-label="close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#334155]">Beat</label>
              <input
                value={beat}
                onChange={(event) => setBeat(event.target.value)}
                placeholder="BEAT 08"
                className="h-11 w-full rounded-xl border border-[#ddd4c8] px-3 text-sm outline-none transition focus:border-[#f97316]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#334155]">Linked Episode</label>
              <input
                value={linked}
                onChange={(event) => setLinked(event.target.value)}
                placeholder="연결된 회차: 12화"
                className="h-11 w-full rounded-xl border border-[#ddd4c8] px-3 text-sm outline-none transition focus:border-[#f97316]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#334155]">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="씬 제목"
              className="h-11 w-full rounded-xl border border-[#ddd4c8] px-3 text-sm outline-none transition focus:border-[#f97316]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#334155]">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="씬 설명"
              className="w-full rounded-xl border border-[#ddd4c8] px-3 py-2 text-sm outline-none transition focus:border-[#f97316]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#ddd4c8] px-4 py-2 text-sm font-semibold text-[#7d6f62] hover:bg-[#faf6f1]"
            >
              취소
            </button>
            <button type="submit" className="rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ea580c]">
              추가하기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SceneCard({
  scene,
  selected,
  scale,
  onSelect,
}: {
  scene: Scene
  selected: boolean
  scale: number
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={selected
        ? "min-h-[260px] w-[290px] rounded-2xl border border-[#f97316] bg-white p-5 text-left shadow-[0_16px_30px_rgba(15,23,42,0.12)]"
        : "min-h-[240px] w-[250px] rounded-2xl border border-[#d8dee9] bg-white p-4 text-left shadow-sm"
      }
      style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
    >
      <div className="mb-3 flex items-start justify-between">
        <span className={selected
          ? "rounded-full bg-[#f97316] px-3 py-1 text-xs font-bold text-white"
          : "rounded-full bg-[#f3eee7] px-3 py-1 text-xs font-bold text-[#7d6f62]"
        }>
          {scene.beat}
        </span>
        <span className="text-[#9a8d7f]"><SlidersHorizontal className="h-4 w-4" /></span>
      </div>

      <h3 className="text-xl font-bold text-[#1f2937]">{scene.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#7d6f62]">{scene.description}</p>

      <div className="mt-4 rounded-lg bg-[#faf6f1] px-3 py-2 text-xs font-semibold text-[#f97316]">{scene.linked}</div>

      <div className="mt-4 flex items-center justify-between text-xs font-bold">
        <span className="text-[#f97316]">{(scene.words / 1000).toFixed(1)}K WORDS</span>
        <span className={scene.done ? "text-[#10b981]" : "text-[#9a8d7f]"}>{scene.done ? "진행 완료" : "진행 대기"}</span>
      </div>
    </button>
  )
}

export default function PlotTimelinePage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const projectQuery = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.projects.get(projectId),
    enabled: Boolean(projectId),
  })

  const [act, setAct] = useState<ActKey>("act2")
  const [scenesByAct, setScenesByAct] = useState<Record<ActKey, Scene[]>>(initialScenes)
  const [selectedSceneId, setSelectedSceneId] = useState<string>(initialScenes.act2[1]?.id ?? initialScenes.act2[0]?.id)
  const [zoom, setZoom] = useState(100)
  const [searchText, setSearchText] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const sceneCounterRef = useRef(10)

  const title = `${projectQuery.data?.title || "프로젝트"} 플롯 타임라인`

  const scenes = scenesByAct[act]

  const filteredScenes = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return scenes
    return scenes.filter((scene) => scene.title.toLowerCase().includes(keyword) || scene.description.toLowerCase().includes(keyword))
  }, [scenes, searchText])

  const activeSceneId = useMemo(() => {
    if (filteredScenes.some((scene) => scene.id === selectedSceneId)) {
      return selectedSceneId
    }
    return filteredScenes[0]?.id ?? null
  }, [filteredScenes, selectedSceneId])

  const createScene = (payload: { beat: string; title: string; description: string; linked: string }) => {
    const nextSceneId = `${act}-scene-${sceneCounterRef.current}`
    sceneCounterRef.current += 1

    const nextScene: Scene = {
      id: nextSceneId,
      beat: payload.beat,
      title: payload.title,
      description: payload.description,
      linked: payload.linked,
      words: 0,
      done: false,
    }

    setScenesByAct((prev) => ({
      ...prev,
      [act]: [...prev[act], nextScene],
    }))
    setSelectedSceneId(nextScene.id)
    setIsModalOpen(false)
  }

  const exportTimeline = () => {
    const payload = {
      act,
      scenes: scenesByAct[act],
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${projectId}-${act}-timeline.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="-mx-6 -my-8 md:-mx-10 md:-my-10">
      <AddSceneModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={createScene} />

      <section className="border-b border-gray-200 bg-[#f3eee7] px-6 py-12 md:px-14">
        <h1 className="text-4xl font-bold text-[#111827]">{title}</h1>
        <p className="mt-3 text-xl text-[#7d6f62]">나의 세계관을 자유롭게 커스텀해 볼까요? 🪄</p>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-3 md:px-8">
        <div className="inline-flex items-center gap-6 text-base font-semibold">
          <button type="button" onClick={() => setAct("act1")} className={act === "act1" ? "text-[#f97316]" : "text-[#9b8d80]"}>Act I: Setup</button>
          <button type="button" onClick={() => setAct("act2")} className={act === "act2" ? "border-b-2 border-[#f97316] pb-2 text-[#f97316]" : "text-[#9b8d80]"}>Act II: Confrontation</button>
          <button type="button" onClick={() => setAct("act3")} className={act === "act3" ? "text-[#f97316]" : "text-[#9b8d80]"}>Act III: Resolution</button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8d7f]" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search scene"
              className="h-11 rounded-xl border border-[#ddd4c8] bg-[#faf6f1] pl-9 pr-3 text-sm outline-none transition focus:border-[#f97316]"
            />
          </div>

          <div className="flex h-11 items-center gap-2 rounded-xl border border-[#ddd4c8] bg-[#faf6f1] px-3 text-[#9a8d7f]">
            <button type="button" onClick={() => setZoom((prev) => Math.max(80, prev - 10))}><Minus className="h-4 w-4" /></button>
            <input
              type="range"
              min={80}
              max={130}
              step={5}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="accent-[#f97316]"
            />
            <button type="button" onClick={() => setZoom((prev) => Math.min(130, prev + 10))}><Plus className="h-4 w-4" /></button>
          </div>

          <button
            type="button"
            onClick={exportTimeline}
            className="inline-flex items-center gap-2 rounded-xl border border-[#ddd4c8] bg-white px-4 py-2.5 text-sm font-bold text-[#1f2937] shadow-sm"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </section>

      <section className="min-h-[610px] bg-[#fdfbf7] px-6 py-10 md:px-12">
        <div className="flex flex-wrap items-start gap-10">
          {filteredScenes.map((scene, index) => (
            <div key={scene.id} className="flex flex-col items-center gap-4">
              <div className={scene.id === selectedSceneId ? "h-8 w-8 rounded-full border-[5px] border-[#f97316] bg-[#ffd7be]" : "h-6 w-6 rounded-full border-4 border-[#f97316] bg-white"} />
              <span className="text-xs font-bold tracking-wider text-[#f97316]">SCENE {index + 1}</span>
              <SceneCard
                scene={scene}
                selected={scene.id === activeSceneId}
                scale={zoom / 100}
                onSelect={() => setSelectedSceneId(scene.id)}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex h-[240px] w-[250px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d7dde8] text-center text-[#a3b0c2] transition hover:bg-white"
          >
            <Plus className="mb-3 h-7 w-7" />
            <span className="text-xs font-bold tracking-[0.2em]">NEW PLOT POINT</span>
          </button>
        </div>

        {filteredScenes.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-[#d7dde8] bg-white p-5 text-sm text-[#7d6f62]">
            검색 조건에 맞는 씬이 없습니다.
          </div>
        )}
      </section>

      <footer className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3 text-xs font-semibold tracking-wide text-[#7c8ea5] md:px-8">
        <div className="flex items-center gap-6">
          <span className="text-[#10b981]">● SYNC ACTIVE</span>
          <span className="inline-flex items-center gap-1"><Link2 className="h-3 w-3" /> 4 COLLABORATORS</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Last edited 3m ago</span>
          <button type="button" className="rounded-full bg-[#f97316] px-4 py-2 text-[10px] font-bold text-white">
            ANALYZE STRUCTURE
          </button>
        </div>
      </footer>
    </div>
  )
}
