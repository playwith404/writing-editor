"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import { Filter, Plus, Search, X } from "lucide-react"

type CharacterCard = {
  id: string
  name: string
  role: string
  archetype: string
  tags: string[]
  imageUrl: string
  bio: string
}

type RelationshipItem = {
  id: string
  source: string
  target: string
  label: "ALLY" | "RIVAL"
  intensity: number
}

const fallbackCharacters: CharacterCard[] = [
  {
    id: "magilcho",
    name: "마길초",
    role: "주인공",
    archetype: "상남자",
    tags: ["Ambitious", "Reckless", "Brave"],
    imageUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=Magilcho&backgroundColor=f4d0c5",
    bio: "불의를 보면 지나치지 못하는 성격으로, 위험을 감수하고서라도 진실을 파고드는 인물입니다.",
  },
  {
    id: "song-eunchae",
    name: "송은채",
    role: "히로인",
    archetype: "사업가",
    tags: ["Loyal", "Sharp", "Agile"],
    imageUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=Eunchae&backgroundColor=cdebe6",
    bio: "냉정한 판단력과 추진력을 갖춘 파트너로, 갈등 상황에서 균형점을 찾아내는 능력이 뛰어납니다.",
  },
]

const fallbackRelationships: RelationshipItem[] = [
  { id: "r1", source: "마길초", target: "송은채", label: "ALLY", intensity: 82 },
  { id: "r2", source: "마길초", target: "실라스", label: "RIVAL", intensity: 95 },
]

function CharacterProfileCard({
  character,
  selected,
  onClick,
}: {
  character: CharacterCard
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={selected
        ? "overflow-hidden rounded-2xl border-2 border-[#f97316] bg-white text-left shadow-md transition"
        : "overflow-hidden rounded-2xl border border-[#ded8cf] bg-white text-left shadow-sm transition hover:shadow-md"
      }
    >
      <div className="relative h-[300px] bg-[#ead3bf]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={character.imageUrl} alt={character.name} className="h-full w-full object-cover" />
        <span className="absolute right-3 top-3 rounded-lg bg-[#3b3b3b] px-2.5 py-1 text-xs font-bold text-white">
          {character.role}
        </span>
      </div>

      <div className="space-y-3 p-5">
        <div>
          <h3 className="text-2xl font-bold text-[#111827]">{character.name}</h3>
          <p className="mt-1 text-sm text-[#7b6f62]">{character.archetype}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {character.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#f2f1ee] px-2.5 py-1 text-xs font-semibold text-[#6b7280]">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}

function CreateCharacterModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (character: { name: string; role: string; archetype: string; tags: string[] }) => void
}) {
  const [name, setName] = useState("")
  const [role, setRole] = useState("등장인물")
  const [archetype, setArchetype] = useState("")
  const [tags, setTags] = useState("")

  if (!open) return null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    onCreate({
      name: name.trim(),
      role: role.trim() || "등장인물",
      archetype: archetype.trim() || "미지정",
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 5),
    })

    setName("")
    setRole("등장인물")
    setArchetype("")
    setTags("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-[#ddd4c8] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#111827]">Create New Character</h3>
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
              placeholder="캐릭터 이름"
              className="h-11 w-full rounded-xl border border-[#ddd4c8] px-3 text-sm outline-none transition focus:border-[#8f7f6f]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#334155]">역할</label>
              <input
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="주인공"
                className="h-11 w-full rounded-xl border border-[#ddd4c8] px-3 text-sm outline-none transition focus:border-[#8f7f6f]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#334155]">아키타입</label>
              <input
                value={archetype}
                onChange={(event) => setArchetype(event.target.value)}
                placeholder="모험가"
                className="h-11 w-full rounded-xl border border-[#ddd4c8] px-3 text-sm outline-none transition focus:border-[#8f7f6f]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#334155]">태그 (쉼표 구분)</label>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="Brave, Loyal"
              className="h-11 w-full rounded-xl border border-[#ddd4c8] px-3 text-sm outline-none transition focus:border-[#8f7f6f]"
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
            <button type="submit" className="rounded-xl bg-[#8f7f6f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7f6f60]">
              생성하기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectCharactersPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const [tab, setTab] = useState<"profiles" | "relationships">("profiles")
  const [characters, setCharacters] = useState<CharacterCard[]>(fallbackCharacters)
  const [searchText, setSearchText] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(fallbackCharacters[0].id)
  const characterCounterRef = useRef(fallbackCharacters.length + 1)

  const roles = useMemo(() => ["all", ...Array.from(new Set(characters.map((character) => character.role)))], [characters])

  const filteredCharacters = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return characters.filter((character) => {
      const matchedByKeyword =
        keyword.length === 0 ||
        character.name.toLowerCase().includes(keyword) ||
        character.tags.some((tag) => tag.toLowerCase().includes(keyword))

      const matchedByRole = roleFilter === "all" || character.role === roleFilter

      return matchedByKeyword && matchedByRole
    })
  }, [characters, roleFilter, searchText])

  const selectedCharacter = characters.find((character) => character.id === selectedCharacterId) ?? characters[0]

  const createCharacter = (payload: { name: string; role: string; archetype: string; tags: string[] }) => {
    const id = `character-${characterCounterRef.current}`
    characterCounterRef.current += 1

    const next: CharacterCard = {
      id,
      name: payload.name,
      role: payload.role,
      archetype: payload.archetype,
      tags: payload.tags.length > 0 ? payload.tags : ["Adaptive", "Curious"],
      imageUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(payload.name)}&backgroundColor=e8e4df`,
      bio: `${payload.name}의 기본 소개가 아직 비어 있습니다. 설정을 추가해 주세요.`,
    }

    setCharacters((prev) => [...prev, next])
    setSelectedCharacterId(id)
    setIsCreateModalOpen(false)
  }

  return (
    <div className="-mx-6 -my-8 md:-mx-10 md:-my-10">
      <CreateCharacterModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreate={createCharacter} />

      <section className="border-b border-gray-200 bg-white px-6 py-4 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-5">
            <button
              type="button"
              onClick={() => setTab("profiles")}
              className={tab === "profiles"
                ? "border-b-2 border-[#8f7f6f] pb-3 text-base font-bold text-[#1f2937]"
                : "pb-3 text-base font-bold text-[#6b7280]"
              }
            >
              Profiles
            </button>
            <button
              type="button"
              onClick={() => setTab("relationships")}
              className={tab === "relationships"
                ? "border-b-2 border-[#8f7f6f] pb-3 text-base font-bold text-[#1f2937]"
                : "pb-3 text-base font-bold text-[#6b7280]"
              }
            >
              Relationships
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                type="text"
                placeholder="Search characters..."
                className="h-11 w-[220px] rounded-xl bg-[#f4f1ec] pl-9 pr-4 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#bcae9f]"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-xl bg-[#8f7f6f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#7f6f60]"
            >
              + Create New Character
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilterMenu((prev) => !prev)}
                className="rounded-lg p-2 text-[#6b7280] hover:bg-gray-100"
              >
                <Filter className="h-5 w-5" />
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 top-11 z-20 w-40 rounded-xl border border-[#d9d3cb] bg-white p-1.5 shadow-lg">
                  {roles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setRoleFilter(role)
                        setShowFilterMenu(false)
                      }}
                      className={roleFilter === role
                        ? "w-full rounded-lg bg-[#f3f0eb] px-3 py-2 text-left text-sm font-semibold text-[#5f5245]"
                        : "w-full rounded-lg px-3 py-2 text-left text-sm text-[#6b7280] hover:bg-[#f9f7f4]"
                      }
                    >
                      {role === "all" ? "모든 역할" : role}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fdfbf7] px-6 py-10 md:px-14">
        <h1 className="text-4xl font-bold text-[#1f2937]">마길초전 캐릭터</h1>
        <p className="mt-3 text-xl text-[#7d6f62]">작품의 캐릭터들을 자유롭게 커스텀해 볼까요? 🪄</p>

        {tab === "profiles" ? (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:max-w-4xl">
                {filteredCharacters.map((character) => (
                  <CharacterProfileCard
                    key={character.id}
                    character={character}
                    selected={character.id === selectedCharacterId}
                    onClick={() => setSelectedCharacterId(character.id)}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex h-full min-h-[520px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d9d3cb] bg-transparent text-center transition hover:bg-white"
                >
                  <span className="mb-4 inline-flex rounded-full bg-[#ece9e4] p-5 text-[#8a8177]">
                    <Plus className="h-7 w-7" />
                  </span>
                  <span className="text-xl font-semibold text-[#6b7280]">Add New Character</span>
                </button>
              </div>

              {selectedCharacter && (
                <aside className="rounded-2xl border border-[#ded8cf] bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-bold tracking-wider text-[#8f7f6f]">SELECTED PROFILE</h3>
                  <div className="mt-4 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedCharacter.imageUrl} alt={selectedCharacter.name} className="h-14 w-14 rounded-xl border border-[#e3ddd5]" />
                    <div>
                      <div className="text-xl font-bold text-[#1f2937]">{selectedCharacter.name}</div>
                      <div className="text-sm text-[#7b6f62]">{selectedCharacter.role} · {selectedCharacter.archetype}</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#7d6f62]">{selectedCharacter.bio}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedCharacter.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[#f2f1ee] px-2.5 py-1 text-xs font-semibold text-[#6b7280]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </aside>
              )}
            </div>

            {filteredCharacters.length === 0 && (
              <div className="mt-6 rounded-xl border border-dashed border-[#d9d3cb] bg-white p-6 text-sm text-[#7d6f62]">
                필터 조건에 맞는 캐릭터가 없습니다.
              </div>
            )}
          </>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-2xl border border-[#ded8cf] bg-white p-5">
              <h3 className="text-sm font-bold tracking-wider text-[#8f7f6f]">RELATIONSHIP LIST</h3>
              <div className="mt-4 space-y-3">
                {fallbackRelationships.map((row) => (
                  <div key={row.id} className="rounded-xl border border-[#ece7df] bg-[#faf9f7] p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-[#1f2937]">{row.source} ↔ {row.target}</div>
                      <span className={row.label === "ALLY"
                        ? "rounded-full bg-[#ecfdf3] px-2 py-0.5 text-[11px] font-bold text-[#22a060]"
                        : "rounded-full bg-[#feecec] px-2 py-0.5 text-[11px] font-bold text-[#ef4444]"
                      }>
                        {row.label}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]">
                      <div className={row.label === "ALLY" ? "h-1.5 bg-[#22a060]" : "h-1.5 bg-[#ef4444]"} style={{ width: `${row.intensity}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-2xl border border-[#ded8cf] bg-white p-5">
              <h3 className="text-sm font-bold tracking-wider text-[#8f7f6f]">GRAPH VIEW</h3>
              <p className="mt-3 text-sm leading-6 text-[#7d6f62]">노드 기반 편집은 세계관의 관계성 화면에서 진행합니다.</p>
              <Link href={`/projects/${projectId}/planning`} className="mt-4 inline-flex rounded-xl bg-[#8f7f6f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7f6f60]">
                Open Relationship Graph
              </Link>
            </aside>
          </div>
        )}
      </section>
    </div>
  )
}
