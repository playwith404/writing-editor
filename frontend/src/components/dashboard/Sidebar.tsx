"use client"

import clsx from "clsx"
import Link from "next/link"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ChevronDown,
  ChevronUp,
  Folder,
  Globe,
  Home,
  Map,
  Pencil,
  Plus,
  PenSquare,
  Settings,
  Users,
} from "lucide-react"
import { api, ApiError } from "@/lib/api"

type ProjectMenuItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

type EpisodeItem = {
  id: string
  title: string
  orderIndex: number
}

function isExactOrChild(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function HomeButton({ pathname, href, label, outlined = false, icon: Icon }: { pathname: string; href: string; label: string; outlined?: boolean; icon: React.ComponentType<{ className?: string }> }) {
  const active = pathname === href

  return (
    <Link
      href={href}
      className={clsx(
        "flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
        outlined
          ? "border border-[#9b8e81] text-[#7a6c5f] hover:bg-[#efebe5]"
          : "border border-gray-200 bg-white text-[#7a6c5f] hover:bg-white",
        active && outlined && "border-[#8f7f6f]",
        active && !outlined && "shadow-sm"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  )
}

function ProjectButton({ item, active }: { item: ProjectMenuItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={clsx(
        "relative flex items-center gap-3 rounded-md px-4 py-2 text-sm transition",
        active
          ? "border-r-4 border-[#938274] bg-[#dcd8d2] font-semibold text-[#6f6357]"
          : "font-medium text-[#7f7367] hover:bg-[#e9e5df]"
      )}
      aria-current={active ? "page" : undefined}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ projectId: string }>()
  const projectId = params?.projectId
  const editorHref = projectId ? `/projects/${projectId}/editor` : "/projects"
  const queryClient = useQueryClient()

  const projectQuery = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.projects.get(projectId),
    enabled: Boolean(projectId),
  })

  const episodesQuery = useQuery({
    queryKey: ["episodes", projectId],
    queryFn: () => api.episodes.list(projectId),
    enabled: Boolean(projectId),
  })

  const episodes = useMemo(() => {
    const list = (episodesQuery.data ?? []) as Array<{ id: string; title: string; orderIndex: number }>
    return [...list].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
  }, [episodesQuery.data])

  const currentEpisodeId = searchParams.get("episodeId")

  const [seriesTitle, setSeriesTitle] = useState("프로젝트")
  const [seriesTitleDraft, setSeriesTitleDraft] = useState("프로젝트")
  const [isEditingSeriesTitle, setIsEditingSeriesTitle] = useState(false)
  const [episodeError, setEpisodeError] = useState<string | null>(null)

  const projectItems: ProjectMenuItem[] = projectId
    ? [
        { label: "World Building", href: `/projects/${projectId}`, icon: Globe },
        { label: "Characters", href: `/projects/${projectId}/stats`, icon: Users },
        { label: "Plot", href: `/projects/${projectId}/publishing`, icon: Map },
        { label: "Settings", href: `/projects/${projectId}/payment`, icon: Settings },
      ]
    : []

  useEffect(() => {
    if (!projectQuery.data?.title) return
    if (isEditingSeriesTitle) return
    setSeriesTitle(projectQuery.data.title)
    setSeriesTitleDraft(projectQuery.data.title)
  }, [projectQuery.data?.title, isEditingSeriesTitle])

  const startSeriesTitleEdit = () => {
    setSeriesTitleDraft(seriesTitle)
    setIsEditingSeriesTitle(true)
  }

  const commitSeriesTitleEdit = () => {
    const trimmed = seriesTitleDraft.trim()
    if (trimmed) {
      setSeriesTitle(trimmed)
      setSeriesTitleDraft(trimmed)
    } else {
      setSeriesTitleDraft(seriesTitle)
    }
    setIsEditingSeriesTitle(false)
  }

  const cancelSeriesTitleEdit = () => {
    setSeriesTitleDraft(seriesTitle)
    setIsEditingSeriesTitle(false)
  }

  const createEpisodeMutation = useMutation({
    mutationFn: async () => {
      setEpisodeError(null)
      const nextOrderIndex = episodes.length > 0 ? Math.max(...episodes.map((ep) => ep.orderIndex)) + 1 : 1
      const title = `${nextOrderIndex}장. 새 원고`
      return api.episodes.create(projectId, { title, orderIndex: nextOrderIndex })
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["episodes", projectId] })
      router.push(`${editorHref}?episodeId=${encodeURIComponent(created.id)}`)
    },
    onError: (err) => {
      setEpisodeError(err instanceof ApiError ? err.message : "회차 생성에 실패했습니다.")
    },
  })

  const reorderEpisodeMutation = useMutation({
    mutationFn: async ({ episodeId, direction }: { episodeId: string; direction: "up" | "down" }) => {
      setEpisodeError(null)
      const idx = episodes.findIndex((ep) => ep.id === episodeId)
      if (idx < 0) return
      const targetIdx = direction === "up" ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= episodes.length) return

      const a = episodes[idx]
      const b = episodes[targetIdx]
      await Promise.all([
        api.episodes.save(a.id, { orderIndex: b.orderIndex }),
        api.episodes.save(b.id, { orderIndex: a.orderIndex }),
      ])
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["episodes", projectId] })
    },
    onError: (err) => {
      setEpisodeError(err instanceof ApiError ? err.message : "순서 변경에 실패했습니다.")
    },
  })

  return (
    <aside className="hidden h-full w-[260px] shrink-0 flex-col border-r border-gray-200 bg-[#f2f1ee] md:flex lg:w-[300px]">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="px-8 pb-4 pt-8">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://api.dicebear.com/7.x/notionists/svg?seed=Jane&backgroundColor=f4d0c5"
              alt="profile"
              className="h-10 w-10 rounded-full border border-gray-300 bg-white"
            />
            <span className="truncate text-sm font-bold text-[#1f2937]">연우 님의 기획실</span>
          </div>
        </div>

        <div className="px-8 pb-5">
          <hr className="w-4 border-gray-300" />
        </div>

        <div className="space-y-3 px-6">
          <HomeButton pathname={pathname} href="/projects" label="Home" icon={Home} />
          <HomeButton pathname={pathname} href="/settings" label="Settings" icon={Settings} outlined />
        </div>

        {projectId && (
          <>
            <div className="mt-10 px-6">
                <div className="mb-4 flex items-center justify-between px-2 text-[#7b6e61]">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Folder className="h-4 w-4" />
                  {isEditingSeriesTitle ? (
                    <input
                      value={seriesTitleDraft}
                      onChange={(event) => setSeriesTitleDraft(event.target.value)}
                      onBlur={commitSeriesTitleEdit}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          commitSeriesTitleEdit()
                        }
                        if (event.key === "Escape") {
                          event.preventDefault()
                          cancelSeriesTitleEdit()
                        }
                      }}
                      className="h-7 w-36 rounded-md border border-[#cfc2b4] bg-white px-2 text-sm font-semibold text-[#6f6357] outline-none ring-[#938274] focus:ring-1"
                      aria-label="series title"
                      autoFocus
                    />
                  ) : (
                    <span>{seriesTitle}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={startSeriesTitleEdit}
                    className="rounded-md border border-[#d8cec3] bg-white p-1 text-[#7f7367] transition hover:bg-[#f7f2eb]"
                    aria-label="edit series name"
                    title="폴더 이름 수정"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => createEpisodeMutation.mutate()}
                    className="rounded-md border border-[#d8cec3] bg-white p-1 text-[#7f7367] transition hover:bg-[#f7f2eb]"
                    aria-label="add episode"
                    title="회차 추가"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <ChevronUp className="h-4 w-4" />
                </div>
              </div>

              <div className="rounded-md border border-[#dbd5cd] bg-[#eceae6] px-3 py-2 text-sm font-semibold text-[#7c6f62]">
                <div className="flex items-center justify-between">
                  <span>기획</span>
                  <ChevronUp className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3 space-y-1 px-2">
                {projectItems.map((item) => {
                  const active =
                    item.label === "World Building"
                      ? pathname === item.href || pathname === `/projects/${projectId}/planning` || pathname === `/projects/${projectId}/magic`
                      : isExactOrChild(pathname, item.href)

                  return <ProjectButton key={item.label} item={item} active={active} />
                })}
              </div>

              <div className="mt-4 space-y-2 px-1 text-sm text-[#7f7367]">
                {episodeError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {episodeError}
                  </div>
                )}

                {episodesQuery.isLoading && (
                  <div className="rounded-xl border border-[#ded5ca] bg-[#f8f4ee] px-3 py-2 text-sm font-semibold text-[#6f6357]">
                    목차를 불러오는 중...
                  </div>
                )}

                {!episodesQuery.isLoading && episodes.length === 0 && (
                  <div className="rounded-xl border border-[#ded5ca] bg-[#f8f4ee] px-3 py-2 text-sm font-semibold text-[#6f6357]">
                    아직 생성된 회차가 없습니다.
                  </div>
                )}

                {episodes.map((episode, episodeIndex) => {
                  const active = currentEpisodeId === episode.id
                  return (
                    <div key={episode.id} className={clsx("rounded-xl border px-3 py-2", active ? "border-[#b9aa98] bg-white" : "border-[#ded5ca] bg-[#f8f4ee]")}>
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`${editorHref}?episodeId=${encodeURIComponent(episode.id)}`}
                          className="truncate text-sm font-semibold text-[#6f6357] hover:text-[#5a4f44]"
                          title={episode.title}
                        >
                          {episode.title}
                        </Link>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => reorderEpisodeMutation.mutate({ episodeId: episode.id, direction: "up" })}
                            disabled={episodeIndex === 0 || reorderEpisodeMutation.isPending}
                            className={clsx(
                              "rounded-md border p-1 transition",
                              episodeIndex === 0
                                ? "cursor-not-allowed border-[#e3dbd0] bg-[#f6f2ec] text-[#b7ab9f]"
                                : "border-[#d8cec3] bg-white text-[#7f7367] hover:bg-[#f4ede4]"
                            )}
                            aria-label="move episode up"
                            title="위로 이동"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => reorderEpisodeMutation.mutate({ episodeId: episode.id, direction: "down" })}
                            disabled={episodeIndex === episodes.length - 1 || reorderEpisodeMutation.isPending}
                            className={clsx(
                              "rounded-md border p-1 transition",
                              episodeIndex === episodes.length - 1
                                ? "cursor-not-allowed border-[#e3dbd0] bg-[#f6f2ec] text-[#b7ab9f]"
                                : "border-[#d8cec3] bg-white text-[#7f7367] hover:bg-[#f4ede4]"
                            )}
                            aria-label="move episode down"
                            title="아래로 이동"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-[#e2dbd1] px-6 py-6">
        <Link href="/projects" className="flex items-center gap-3 text-sm font-semibold text-[#73675b] transition hover:text-[#5c5147]">
          <span className="rounded-2xl bg-[#938274] p-3 text-white shadow-sm">
            <PenSquare className="h-5 w-5" />
          </span>
          <span>새 작품 쓰러가기</span>
        </Link>
        <div className="mt-8 flex items-center justify-between text-xs text-gray-400">
          <span>마지막 수정</span>
          <span>2m ago</span>
        </div>
      </div>
    </aside>
  )
}
