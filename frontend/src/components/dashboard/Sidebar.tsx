"use client"

import clsx from "clsx"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { useRef, useState } from "react"
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

type ProjectMenuItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

type EpisodeItem = {
  id: string
  title: string
}

type ChapterItem = {
  id: string
  title: string
  episodes: EpisodeItem[]
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
  const params = useParams<{ projectId: string }>()
  const projectId = params?.projectId
  const editorHref = projectId ? `/projects/${projectId}/editor` : "/projects"
  const [seriesTitle, setSeriesTitle] = useState("나의 삶 시리즈")
  const [seriesTitleDraft, setSeriesTitleDraft] = useState("나의 삶 시리즈")
  const [isEditingSeriesTitle, setIsEditingSeriesTitle] = useState(false)

  const [chapters, setChapters] = useState<ChapterItem[]>([
    { id: "chapter-1", title: "나의 삶", episodes: [] },
    { id: "chapter-2", title: "나의 삶", episodes: [] },
    { id: "chapter-3", title: "나의 삶", episodes: [] },
  ])

  const chapterCounterRef = useRef(4)
  const episodeCounterRef = useRef(1)

  const projectItems: ProjectMenuItem[] = projectId
    ? [
        { label: "World Building", href: `/projects/${projectId}`, icon: Globe },
        { label: "Characters", href: `/projects/${projectId}/stats`, icon: Users },
        { label: "Plot", href: `/projects/${projectId}/publishing`, icon: Map },
        { label: "Settings", href: `/projects/${projectId}/payment`, icon: Settings },
      ]
    : []

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

  const addChapter = () => {
    const nextChapterNumber = chapterCounterRef.current
    chapterCounterRef.current += 1

    setChapters((prev) => [
      ...prev,
      {
        id: `chapter-${nextChapterNumber}`,
        title: "나의 삶",
        episodes: [],
      },
    ])
  }

  const moveChapter = (currentIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

    setChapters((prev) => {
      if (targetIndex < 0 || targetIndex >= prev.length) return prev

      const reordered = [...prev]
      const [moved] = reordered.splice(currentIndex, 1)
      reordered.splice(targetIndex, 0, moved)
      return reordered
    })
  }

  const addEpisode = (chapterId: string) => {
    const nextEpisodeId = `episode-${episodeCounterRef.current}`
    episodeCounterRef.current += 1

    setChapters((prev) =>
      prev.map((chapter) => {
        if (chapter.id !== chapterId) return chapter
        const nextEpisodeNo = chapter.episodes.length + 1
        return {
          ...chapter,
          episodes: [
            ...chapter.episodes,
            {
              id: nextEpisodeId,
              title: `${nextEpisodeNo}화`,
            },
          ],
        }
      })
    )
  }

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
                    onClick={addChapter}
                    className="rounded-md border border-[#d8cec3] bg-white p-1 text-[#7f7367] transition hover:bg-[#f7f2eb]"
                    aria-label="add chapter"
                    title="장 추가"
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
                {chapters.map((chapter, chapterIndex) => (
                  <div key={chapter.id} className="rounded-xl border border-[#ded5ca] bg-[#f8f4ee] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`${editorHref}?chapter=${chapter.id}`}
                        className="truncate text-sm font-semibold text-[#6f6357] hover:text-[#5a4f44]"
                        title={`${chapterIndex + 1}장 : ${chapter.title}`}
                      >
                        {chapterIndex + 1}장 : {chapter.title}
                      </Link>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveChapter(chapterIndex, "up")}
                          disabled={chapterIndex === 0}
                          className={clsx(
                            "rounded-md border p-1 transition",
                            chapterIndex === 0
                              ? "cursor-not-allowed border-[#e3dbd0] bg-[#f6f2ec] text-[#b7ab9f]"
                              : "border-[#d8cec3] bg-white text-[#7f7367] hover:bg-[#f4ede4]"
                          )}
                          aria-label="move chapter up"
                          title="위로 이동"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveChapter(chapterIndex, "down")}
                          disabled={chapterIndex === chapters.length - 1}
                          className={clsx(
                            "rounded-md border p-1 transition",
                            chapterIndex === chapters.length - 1
                              ? "cursor-not-allowed border-[#e3dbd0] bg-[#f6f2ec] text-[#b7ab9f]"
                              : "border-[#d8cec3] bg-white text-[#7f7367] hover:bg-[#f4ede4]"
                          )}
                          aria-label="move chapter down"
                          title="아래로 이동"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => addEpisode(chapter.id)}
                          className="rounded-md border border-[#d8cec3] bg-white p-1 text-[#7f7367] transition hover:bg-[#f4ede4]"
                          aria-label="add episode"
                          title="화 추가"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {chapter.episodes.length > 0 && (
                      <div className="mt-2 space-y-1 border-l border-[#d8cec3] pl-2">
                        {chapter.episodes.map((episode) => (
                          <Link
                            key={episode.id}
                            href={`${editorHref}?chapter=${chapter.id}&episode=${episode.id}`}
                            className="flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-[#7f7367] transition hover:bg-[#f1e9de]"
                            title={`${chapter.title} ${episode.title}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-[#938274]" />
                            <span>{episode.title}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 px-6 pb-8">
              <div className="mb-2 flex items-center justify-between px-2 text-[#7b6e61]">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Folder className="h-4 w-4" />
                  <span>나의 삶 2 시리즈</span>
                </div>
                <ChevronDown className="h-4 w-4" />
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
