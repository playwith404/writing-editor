"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import type { ComponentType, FormEvent, PointerEvent as ReactPointerEvent } from "react"
import {
  CircleAlert,
  Download,
  Globe,
  History,
  Layers,
  Map,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Users,
  Wand2,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react"

type Relationship = {
  targetId: string
  label: "ALLY" | "RIVAL"
  value: number
}

type CharacterNode = {
  id: string
  name: string
  role: string
  summary: string
  avatar: string
  traits: string[]
  arc: string
  ties: Relationship[]
  x: number
  y: number
}

type TieFilter = "all" | "ally" | "rival"

const fallbackNodes: CharacterNode[] = [
  {
    id: "arthur-vance",
    name: "마길초",
    role: "주인공",
    summary: "진실을 추적하며 사건의 중심으로 들어가는 주인공이다.",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Magilcho",
    traits: ["단호함", "전략적", "책임감", "충동성"],
    arc: "마길초는 진실을 좇는 과정에서 이상과 현실의 균열을 마주한다. 은서와의 신뢰를 지키면서도 점점 더 위험한 선택을 하게 된다.",
    ties: [
      { targetId: "elara-night", label: "ALLY", value: 80 },
      { targetId: "silas-thorne", label: "RIVAL", value: 95 },
    ],
    x: 35,
    y: 34,
  },
  {
    id: "elara-night",
    name: "강은서",
    role: "조력자",
    summary: "정보 분석에 강한 인물로, 냉정한 판단으로 팀의 균형을 잡는다.",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Eunseo",
    traits: ["신뢰", "침착함", "관찰력"],
    arc: "강은서는 마길초의 폭주를 막으면서 스스로의 한계와 두려움을 마주한다.",
    ties: [{ targetId: "arthur-vance", label: "ALLY", value: 80 }],
    x: 68,
    y: 40,
  },
  {
    id: "silas-thorne",
    name: "송은재",
    role: "라이벌",
    summary: "그림자에서 판을 설계하며 갈등을 키우는 핵심 인물이다.",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Eunjae",
    traits: ["계산적", "침착함", "냉혹함"],
    arc: "송은재는 마길초의 약점을 집요하게 파고들며 서사의 갈등을 극대화한다.",
    ties: [{ targetId: "arthur-vance", label: "RIVAL", value: 95 }],
    x: 49,
    y: 74,
  },
]

function relationshipTone(label: "ALLY" | "RIVAL") {
  if (label === "ALLY") {
    return {
      pill: "bg-[#ecfdf3] text-[#22a060]",
      bar: "bg-[#f97316]",
      tag: "신뢰",
    }
  }

  return {
    pill: "bg-[#feecec] text-[#ef4444]",
    bar: "bg-[#ef4444]",
    tag: "갈등",
  }
}

function relationshipLabel(label: "ALLY" | "RIVAL") {
  return label === "ALLY" ? "동맹" : "대립"
}

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

function AddNodeModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (payload: { name: string; role: string; summary: string }) => void
}) {
  const [name, setName] = useState("")
  const [role, setRole] = useState("인물")
  const [summary, setSummary] = useState("")

  if (!open) return null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onCreate({
      name: name.trim(),
      role: role.trim() || "인물",
      summary: summary.trim() || "새 인물의 소개를 입력하세요.",
    })
    setName("")
    setRole("인물")
    setSummary("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-[#ddd4c8] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#111827]">등장인물 노드 추가</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#9a8d7f] hover:bg-[#f8f4ee]" aria-label="close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#334155]">이름</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 레오 하인츠"
              className="h-11 w-full rounded-xl border border-[#ddd4c8] px-3 text-sm outline-none transition focus:border-[#f97316]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#334155]">역할</label>
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="예: 조력자"
              className="h-11 w-full rounded-xl border border-[#ddd4c8] px-3 text-sm outline-none transition focus:border-[#f97316]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#334155]">설명</label>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
              placeholder="인물 설명"
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

function EdgeLines({
  nodes,
  selectedId,
  tieFilter,
  visibleNodeIds,
}: {
  nodes: CharacterNode[]
  selectedId: string
  tieFilter: TieFilter
  visibleNodeIds: Set<string>
}) {
  const edges = useMemo(() => {
    const list: Array<{ from: CharacterNode; to: CharacterNode; label: "ALLY" | "RIVAL" }> = []

    nodes.forEach((node) => {
      if (!visibleNodeIds.has(node.id)) return

      node.ties.forEach((tie) => {
        if (tieFilter === "ally" && tie.label !== "ALLY") return
        if (tieFilter === "rival" && tie.label !== "RIVAL") return

        const target = nodes.find((candidate) => candidate.id === tie.targetId)
        if (!target || !visibleNodeIds.has(target.id)) return

        const existing = list.find(
          (row) =>
            (row.from.id === node.id && row.to.id === target.id) ||
            (row.from.id === target.id && row.to.id === node.id)
        )

        if (!existing) list.push({ from: node, to: target, label: tie.label })
      })
    })

    return list
  }, [nodes, tieFilter, visibleNodeIds])

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      {edges.map((edge) => {
        const highlighted = edge.from.id === selectedId || edge.to.id === selectedId
        const dotted = edge.label === "RIVAL"

        return (
          <g key={`${edge.from.id}-${edge.to.id}`}>
            <line
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              stroke={highlighted ? "#f97316" : "#cbd5e1"}
              strokeWidth={highlighted ? "0.35" : "0.3"}
              strokeDasharray={dotted ? "1.4 0.9" : "0"}
            />
            <text
              x={(edge.from.x + edge.to.x) / 2}
              y={(edge.from.y + edge.to.y) / 2 - 1.2}
              textAnchor="middle"
              fill={highlighted ? "#f97316" : "#9a8d7f"}
              style={{ fontSize: "1.5px", fontWeight: 700 }}
            >
              {relationshipLabel(edge.label)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function PlanningPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const [nodes, setNodes] = useState<CharacterNode[]>(fallbackNodes)
  const [selectedId, setSelectedId] = useState<string>(fallbackNodes[0].id)
  const [tieFilter, setTieFilter] = useState<TieFilter>("all")
  const [searchText, setSearchText] = useState("")
  const [zoom, setZoom] = useState(1)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const nodeCounterRef = useRef(fallbackNodes.length + 1)

  const visibleNodes = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return nodes
    return nodes.filter((node) => node.name.toLowerCase().includes(keyword) || node.role.toLowerCase().includes(keyword))
  }, [nodes, searchText])

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes])
  const activeSelectedId = useMemo(() => {
    if (visibleNodes.some((node) => node.id === selectedId)) return selectedId
    return visibleNodes[0]?.id ?? nodes[0]?.id ?? ""
  }, [nodes, selectedId, visibleNodes])

  const selectedNode = nodes.find((node) => node.id === activeSelectedId) ?? nodes[0]

  const relationshipCards = selectedNode
    ? selectedNode.ties
        .filter((tie) => {
          if (tieFilter === "ally") return tie.label === "ALLY"
          if (tieFilter === "rival") return tie.label === "RIVAL"
          return true
        })
        .map((tie) => {
          const target = nodes.find((node) => node.id === tie.targetId)
          if (!target) return null
          return { tie, target }
        })
        .filter((row): row is { tie: Relationship; target: CharacterNode } => Boolean(row))
    : []

  const updateNodePosition = (event: ReactPointerEvent, nodeId: string) => {
    if (draggingNodeId !== nodeId) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const rawX = ((event.clientX - rect.left) / rect.width) * 100
    const rawY = ((event.clientY - rect.top) / rect.height) * 100

    const nextX = Math.max(14, Math.min(86, rawX / zoom))
    const nextY = Math.max(12, Math.min(88, rawY / zoom))

    setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, x: nextX, y: nextY } : node)))
  }

  const createNode = (payload: { name: string; role: string; summary: string }) => {
    const nextId = `node-${nodeCounterRef.current}`
    nodeCounterRef.current += 1

    const newNode: CharacterNode = {
      id: nextId,
      name: payload.name,
      role: payload.role,
      summary: payload.summary,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(payload.name)}`,
      traits: ["Adaptive", "Driven", "Curious"],
      arc: `${payload.name}의 서사 흐름을 업데이트해 보세요.`,
      ties: selectedNode ? [{ targetId: selectedNode.id, label: "ALLY", value: 70 }] : [],
      x: 54,
      y: 52,
    }

    setNodes((prev) => {
      if (!selectedNode) return [...prev, newNode]
      return prev.map((node) => {
        if (node.id !== selectedNode.id) return node
        return {
          ...node,
          ties: [...node.ties, { targetId: newNode.id, label: "ALLY", value: 70 }],
        }
      }).concat(newNode)
    })

    setSelectedId(newNode.id)
    setIsAddModalOpen(false)
  }

  const resetLayout = () => {
    setNodes(fallbackNodes)
    setSelectedId(fallbackNodes[0].id)
    setSearchText("")
    setTieFilter("all")
    setZoom(1)
  }

  return (
    <div className="-mx-6 -my-8 md:-mx-10 md:-my-10">
      <AddNodeModal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onCreate={createNode} />

      <section className="border-b border-gray-200 bg-white px-6 py-10 md:px-14">
        <h1 className="text-4xl font-bold text-[#111827]">마길초전 세계관- 관계성</h1>
        <p className="mt-3 text-xl text-[#7d6f62]">내 세계관의 관계성을 자유롭게 커스텀해 볼까요? 🪄</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <CategoryLink href={`/projects/${projectId}`} label="전체 카테고리" icon={Map} />
          <CategoryLink href={`/projects/${projectId}/glossary`} label="용어" icon={Globe} />
          <CategoryLink href={`/projects/${projectId}/publishing`} label="역사" icon={History} />
          <CategoryLink href={`/projects/${projectId}/planning`} label="관계성" icon={Users} active />
          <CategoryLink href={`/projects/${projectId}/magic`} label="마법 체계" icon={Wand2} />
        </div>
      </section>

      <section className={inspectorOpen ? "grid min-h-[760px] lg:grid-cols-[1fr_320px]" : "min-h-[760px]"}>
        <div className="relative border-r border-gray-200 bg-[#f3eee7]">
          <div className="flex h-full">
            <div className="flex w-16 flex-col items-center border-r border-[#ded4c8] py-5">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="mb-5 rounded-xl bg-[#f97316] p-2.5 text-white shadow-md"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button type="button" className="mb-4 rounded-lg p-2 text-[#9a8d7f] hover:bg-white">
                <Sparkles className="h-5 w-5" />
              </button>
              <button type="button" className="mb-4 rounded-lg p-2 text-[#9a8d7f] hover:bg-white">
                <Layers className="h-5 w-5" />
              </button>
              <button type="button" className="mt-auto rounded-lg p-2 text-[#9a8d7f] hover:bg-white">
                <Search className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(1.4, Number((prev + 0.1).toFixed(2))))}
                className="mt-2 rounded-lg p-2 text-[#9a8d7f] hover:bg-white"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.8, Number((prev - 0.1).toFixed(2))))}
                className="mt-2 rounded-lg p-2 text-[#9a8d7f] hover:bg-white"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex-1 p-6 md:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-xl border border-[#ddd4c8] bg-[#faf6f1] p-1 text-sm font-semibold text-[#7d6f62]">
                  <button
                    type="button"
                    onClick={() => setTieFilter("all")}
                    className={tieFilter === "all" ? "rounded-lg bg-white px-4 py-1.5 text-[#f97316] shadow-sm" : "rounded-lg px-4 py-1.5 hover:bg-white"}
                  >
                    전체 관계
                  </button>
                  <button
                    type="button"
                    onClick={() => setTieFilter("ally")}
                    className={tieFilter === "ally" ? "rounded-lg bg-white px-4 py-1.5 text-[#f97316] shadow-sm" : "rounded-lg px-4 py-1.5 hover:bg-white"}
                  >
                    동맹
                  </button>
                  <button
                    type="button"
                    onClick={() => setTieFilter("rival")}
                    className={tieFilter === "rival" ? "rounded-lg bg-white px-4 py-1.5 text-[#f97316] shadow-sm" : "rounded-lg px-4 py-1.5 hover:bg-white"}
                  >
                    대립
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8d7f]" />
                    <input
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="노드 검색"
                      className="h-10 rounded-xl border border-[#ddd4c8] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#f97316]"
                    />
                  </div>
                  <div className="rounded-lg border border-[#ddd4c8] bg-white px-3 py-2 text-xs font-bold text-[#7d6f62]">{Math.round(zoom * 100)}%</div>
                </div>
              </div>

              <div ref={canvasRef} className="relative h-[620px] overflow-hidden rounded-2xl border border-[#ddd4c8] bg-[#fdfbf7]">
                <div className="absolute inset-0 origin-top-left" style={{ transform: `scale(${zoom})` }}>
                  <EdgeLines
                    nodes={nodes}
                    selectedId={activeSelectedId}
                    tieFilter={tieFilter}
                    visibleNodeIds={visibleNodeIds}
                  />

                  {visibleNodes.map((node) => {
                    const active = activeSelectedId === node.id

                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setSelectedId(node.id)}
                        onPointerDown={(event) => {
                          setDraggingNodeId(node.id)
                          event.currentTarget.setPointerCapture(event.pointerId)
                        }}
                        onPointerMove={(event) => updateNodePosition(event, node.id)}
                        onPointerUp={() => setDraggingNodeId(null)}
                        onPointerCancel={() => setDraggingNodeId(null)}
                        style={{
                          left: `calc(${node.x}% - 120px)`,
                          top: `calc(${node.y}% - 50px)`,
                        }}
                        className={active
                          ? "absolute w-[240px] rounded-2xl border-2 border-[#f97316] bg-white p-4 text-left shadow-lg"
                          : "absolute w-[240px] rounded-2xl border border-[#d8cec3] bg-white p-4 text-left shadow-sm"
                        }
                      >
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={node.avatar} alt={node.name} className="h-10 w-10 rounded-lg border border-gray-200 object-cover" />
                          <div className="min-w-0">
                            <div className="truncate text-lg font-bold text-[#1f2937]">{node.name}</div>
                            <div className={active ? "inline-flex rounded-full bg-[#fff0e6] px-2 py-0.5 text-[10px] font-bold text-[#f97316]" : "inline-flex rounded-full bg-[#f3eee7] px-2 py-0.5 text-[10px] font-bold text-[#9a8d7f]"}>
                              {node.role}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[#9a8d7f]">
                          <span>{node.ties.length}개 관계</span>
                          <span className="text-[#f97316]">노드 편집</span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-xl border border-[#ddd4c8] bg-white p-2 shadow-sm">
                  <button type="button" className="rounded-md p-2 text-[#9a8d7f] hover:bg-[#faf6f1]">
                    <Download className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={resetLayout} className="rounded-md p-2 text-[#9a8d7f] hover:bg-[#faf6f1]">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {inspectorOpen && (
          <aside className="border-l border-gray-200 bg-[#faf6f1] p-5">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 text-sm font-bold tracking-wide text-[#111827]">
                <CircleAlert className="h-4 w-4 text-[#f97316]" />
                노드 정보 패널
              </div>
              <button type="button" onClick={() => setInspectorOpen(false)} className="rounded-lg p-1 text-[#9a8d7f] hover:bg-white">✕</button>
            </div>

            {selectedNode && (
              <>
                <div className="mt-6 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedNode.avatar} alt={selectedNode.name} className="h-16 w-16 rounded-2xl border border-[#f97316] object-cover" />
                    <div>
                      <h3 className="text-2xl font-bold text-[#111827]">{selectedNode.name}</h3>
                    </div>
                  </div>
                  <button type="button" className="rounded-lg bg-[#f3eee7] p-2 text-[#f97316]">
                    <PenLine className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-3 text-sm leading-6 text-[#7d6f62]">{selectedNode.summary}</p>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold tracking-wider text-[#9a8d7f]">
                    <span>캐릭터 성향</span>
                    <button type="button" className="text-[#f97316]">+ 추가</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedNode.traits.map((trait) => (
                      <span key={trait} className="rounded-full bg-[#f3eee7] px-3 py-1 text-xs font-semibold text-[#334155]">{trait}</span>
                    ))}
                  </div>
                </div>

                <div className="mt-7">
                  <h4 className="text-xs font-bold tracking-wider text-[#9a8d7f]">활성 관계</h4>
                  <div className="mt-3 space-y-3">
                    {relationshipCards.map(({ tie, target }) => {
                      const tone = relationshipTone(tie.label)

                      return (
                        <div key={`${selectedNode.id}-${target.id}`} className="rounded-xl border border-[#e4dbd1] bg-white p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#1f2937]" />
                              {target.name}
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.pill}`}>{relationshipLabel(tie.label)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#e2d9cf]">
                            <div className={`h-1.5 ${tone.bar}`} style={{ width: `${tie.value}%` }} />
                          </div>
                          <div className="mt-2 text-right text-[10px] font-bold text-[#9a8d7f]">{tone.tag}: {tie.value}%</div>
                        </div>
                      )
                    })}
                    {relationshipCards.length === 0 && (
                      <div className="rounded-xl border border-dashed border-[#d8cec3] bg-white p-3 text-xs text-[#9a8d7f]">
                        선택한 필터 기준 관계가 없습니다.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-7">
                  <h4 className="text-xs font-bold tracking-wider text-[#9a8d7f]">서사 궤적</h4>
                  <div className="mt-3 rounded-xl border border-[#e4dbd1] bg-[#f8f4ee] p-4 text-sm leading-6 text-[#475569]">
                    {selectedNode.arc}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setGeneratedAt(new Date().toLocaleTimeString())}
                  className="mt-6 w-full rounded-2xl bg-[#f97316] py-3 font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
                >
                  관계 생성하기
                </button>
                {generatedAt && <p className="mt-2 text-center text-xs text-[#9a8d7f]">마지막 생성 {generatedAt}</p>}
              </>
            )}
          </aside>
        )}
      </section>

      {!inspectorOpen && (
        <div className="fixed bottom-6 right-6">
          <button
            type="button"
            onClick={() => setInspectorOpen(true)}
            className="rounded-full bg-[#8f7f6f] px-4 py-2 text-sm font-semibold text-white shadow-lg"
          >
            정보 패널 열기
          </button>
        </div>
      )}
    </div>
  )
}
