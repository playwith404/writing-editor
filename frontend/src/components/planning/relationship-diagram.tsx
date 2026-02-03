"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

type Position = { x: number; y: number }
type Positions = Record<string, Position>

const NODE_WIDTH = 170
const NODE_HEIGHT = 74
const PADDING = 24
const GAP_X = 220
const GAP_Y = 140

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

function normalizePositions(value: unknown): Positions {
  if (!isRecord(value)) return {}
  const out: Positions = {}
  for (const [key, pos] of Object.entries(value)) {
    if (!isRecord(pos)) continue
    const x = typeof pos.x === "number" ? pos.x : Number(pos.x)
    const y = typeof pos.y === "number" ? pos.y : Number(pos.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    out[key] = { x, y }
  }
  return out
}

function buildGridLayout(ids: string[], canvasWidth: number): Positions {
  const width = Math.max(canvasWidth || 0, 640)
  const maxCols = Math.max(1, Math.floor((width - PADDING * 2) / GAP_X))
  const cols = Math.max(1, Math.min(maxCols, 6))

  const positions: Positions = {}
  ids.forEach((id, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    positions[id] = {
      x: PADDING + col * GAP_X,
      y: PADDING + row * GAP_Y,
    }
  })
  return positions
}

export function RelationshipDiagram({
  projectId,
  characters,
  relationships,
}: {
  projectId: string
  characters: Array<{ id: string; name: string; role?: string | null }>
  relationships: Array<{
    id: string
    characterAId: string
    characterBId: string
    relationType?: string | null
    isBidirectional?: boolean | null
  }>
}) {
  const queryClient = useQueryClient()

  const projectQuery = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.projects.get(projectId),
  })

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 560 })

  const [positions, setPositions] = useState<Positions>({})
  const positionsRef = useRef<Positions>({})
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const charIds = useMemo(() => characters.map((c) => String(c.id)), [characters])

  useEffect(() => {
    positionsRef.current = positions
  }, [positions])

  useEffect(() => {
    const el = canvasRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const rect = entry.contentRect
      if (!rect) return
      setCanvasSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 서버에 저장된 레이아웃 로드
  useEffect(() => {
    const settings = projectQuery.data?.settings
    if (!settings) return
    const stored = normalizePositions((settings as any)?.relationshipDiagram?.positions)
    if (Object.keys(stored).length === 0) return
    setPositions((prev) => {
      // 이미 포지션이 있으면 덮어쓰지 않음 (사용자 조작 우선)
      if (Object.keys(prev).length > 0) return prev
      return stored
    })
  }, [projectQuery.data?.settings])

  // 새 캐릭터가 추가되면, 포지션이 없는 노드는 자동 배치
  useEffect(() => {
    if (charIds.length === 0) return
    setPositions((prev) => {
      const next: Positions = { ...prev }
      const missing = charIds.filter((id) => !next[id])
      if (missing.length === 0) return prev

      const existingCount = Object.keys(next).length
      const base = buildGridLayout(charIds, canvasSize.width)
      missing.forEach((id, idx) => {
        const fallbackId = charIds[existingCount + idx]
        next[id] = base[fallbackId] || { x: PADDING, y: PADDING }
      })
      return next
    })
  }, [charIds, canvasSize.width])

  const saveMutation = useMutation({
    mutationFn: async (nextPositions: Positions) => {
      setError(null)

      const current = projectQuery.data ?? (queryClient.getQueryData(["projects", projectId]) as any) ?? (await api.projects.get(projectId))
      const settings = isRecord(current?.settings) ? (current.settings as Record<string, unknown>) : {}
      const rel = isRecord((settings as any).relationshipDiagram) ? ((settings as any).relationshipDiagram as Record<string, unknown>) : {}

      const nextSettings = {
        ...settings,
        relationshipDiagram: {
          ...rel,
          positions: nextPositions,
        },
      }

      return api.projects.update(projectId, { settings: nextSettings })
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["projects", projectId], updated)
      setDirty(false)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "레이아웃 저장에 실패했습니다."),
  })

  const clampPosition = (pos: Position): Position => {
    const maxX = Math.max(0, canvasSize.width - NODE_WIDTH - PADDING)
    const maxY = Math.max(0, canvasSize.height - NODE_HEIGHT - PADDING)
    return {
      x: clamp(pos.x, PADDING, maxX),
      y: clamp(pos.y, PADDING, maxY),
    }
  }

  const [drag, setDrag] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)

  const startDrag = (e: ReactPointerEvent, id: string) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const startX = e.clientX - rect.left
    const startY = e.clientY - rect.top
    const pos = positions[id] ?? { x: PADDING, y: PADDING }

    setDrag({
      id,
      offsetX: startX - pos.x,
      offsetY: startY - pos.y,
    })
    setError(null)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const moveDrag = (e: ReactPointerEvent, id: string) => {
    if (!drag || drag.id !== id) return
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - drag.offsetX
    const y = e.clientY - rect.top - drag.offsetY

    setPositions((prev) => {
      const next = { ...prev, [id]: clampPosition({ x, y }) }
      positionsRef.current = next
      return next
    })
    setDirty(true)
  }

  const endDrag = (_e: ReactPointerEvent, id: string) => {
    if (!drag || drag.id !== id) return
    setDrag(null)
    // 드래그 종료 시 자동 저장(바로)
    saveMutation.mutate(positionsRef.current)
  }

  const autoLayout = () => {
    const next = buildGridLayout(charIds, canvasSize.width)
    setPositions(next)
    setDirty(true)
  }

  const resetLayout = () => {
    const next = buildGridLayout(charIds, canvasSize.width)
    setPositions(next)
    setDirty(true)
  }

  const lines = useMemo(() => {
    return relationships
      .map((r) => {
        const a = positions[String(r.characterAId)]
        const b = positions[String(r.characterBId)]
        if (!a || !b) return null
        const x1 = a.x + NODE_WIDTH / 2
        const y1 = a.y + NODE_HEIGHT / 2
        const x2 = b.x + NODE_WIDTH / 2
        const y2 = b.y + NODE_HEIGHT / 2
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        return {
          id: String(r.id),
          x1,
          y1,
          x2,
          y2,
          midX,
          midY,
          label: (r.relationType || "").toString(),
        }
      })
      .filter(Boolean) as Array<{ id: string; x1: number; y1: number; x2: number; y2: number; midX: number; midY: number; label: string }>
  }, [relationships, positions])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">드래그 관계도</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              노드를 드래그해서 배치할 수 있습니다. 배치는 프로젝트 설정에 저장됩니다.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={autoLayout}>
              자동 배치
            </Button>
            <Button size="sm" variant="outline" onClick={resetLayout}>
              초기화
            </Button>
            <Button
              size="sm"
              disabled={!dirty || saveMutation.isPending}
              onClick={() => saveMutation.mutate(positionsRef.current)}
            >
              {saveMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Separator />

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div
          ref={canvasRef}
          className="relative w-full h-[560px] rounded-md border bg-muted/10 overflow-hidden"
        >
          {/* Edge layer */}
          <svg
            className="absolute inset-0"
            width={canvasSize.width}
            height={canvasSize.height}
            viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
            preserveAspectRatio="none"
          >
            {lines.map((l) => (
              <g key={l.id}>
                <line
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  stroke="hsl(var(--muted-foreground))"
                  strokeOpacity={0.5}
                  strokeWidth={2}
                />
                {l.label && (
                  <text
                    x={l.midX}
                    y={l.midY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={12}
                    fill="hsl(var(--foreground))"
                    opacity={0.8}
                  >
                    {l.label}
                  </text>
                )}
              </g>
            ))}
          </svg>

          {/* Nodes */}
          {characters.map((c) => {
            const id = String(c.id)
            const pos = positions[id] ?? { x: PADDING, y: PADDING }
            const p = clampPosition(pos)
            const selected = drag?.id === id

            return (
              <div
                key={id}
                className={`absolute select-none touch-none ${selected ? "z-20" : "z-10"}`}
                style={{ left: p.x, top: p.y, width: NODE_WIDTH }}
              >
                <div
                  onPointerDown={(e) => startDrag(e, id)}
                  onPointerMove={(e) => moveDrag(e, id)}
                  onPointerUp={(e) => endDrag(e, id)}
                  onPointerCancel={(e) => endDrag(e, id)}
                  className={`rounded-lg border bg-background shadow-sm px-3 py-2 cursor-grab active:cursor-grabbing ${
                    selected ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.role || "역할 없음"}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 truncate">
                    연결 {relationships.filter((r) => String(r.characterAId) === id || String(r.characterBId) === id).length}
                  </div>
                </div>
              </div>
            )
          })}

          {characters.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              인물을 먼저 추가해 주세요.
            </div>
          )}
          {characters.length > 0 && relationships.length === 0 && (
            <div className="absolute bottom-3 left-3 text-xs text-muted-foreground">
              아직 등록된 관계가 없습니다. 관계를 추가하면 선이 표시됩니다.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
