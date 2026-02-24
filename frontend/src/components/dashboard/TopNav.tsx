"use client"

import clsx from "clsx"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { Bell, Menu, Search, Settings } from "lucide-react"

type NavTab = {
  label: string
  href: string
}

function shouldHideTopNav(pathname: string) {
  if (pathname === "/projects") return true
  if (pathname === "/settings") return true
  if (pathname.endsWith("/stats")) return true
  return false
}

export default function TopNav() {
  const pathname = usePathname()
  const params = useParams<{ projectId: string }>()
  const projectId = params?.projectId

  if (shouldHideTopNav(pathname) || !projectId) return null

  const tabs: NavTab[] = [
    { label: "전체 설정", href: `/projects/${projectId}` },
    { label: "용어", href: `/projects/${projectId}/glossary` },
    { label: "역사", href: `/projects/${projectId}/publishing` },
    { label: "마법 체계", href: `/projects/${projectId}/magic` },
  ]

  return (
    <header className="h-[72px] shrink-0 border-b border-gray-200 bg-white">
      <div className="flex h-full items-center justify-between px-6 md:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <button type="button" className="rounded-md p-1 text-[#8d7d6d] hover:bg-gray-100" aria-label="menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate text-lg font-bold text-[#111827]">세계관 설정</h1>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <nav className="hidden items-center gap-5 text-sm font-medium text-[#8f8172] lg:flex">
            {tabs.map((tab) => {
              const active = tab.label === "전체 설정"
                ? pathname === tab.href
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={clsx(
                    "border-b-2 pb-[24px] pt-[24px] transition",
                    active
                      ? "border-[#938274] font-bold text-[#938274]"
                      : "border-transparent hover:text-[#374151]"
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>

          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="세계관 검색..."
              className="h-10 w-[220px] rounded-[13px] border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#938274]"
            />
          </div>

          <div className="flex items-center gap-2 text-[#9a8d7f] md:gap-3">
            <button type="button" className="rounded-md p-1.5 hover:bg-gray-100 hover:text-[#7d6f62]" aria-label="settings">
              <Settings className="h-5 w-5" />
            </button>
            <button type="button" className="rounded-md p-1.5 hover:bg-gray-100 hover:text-[#7d6f62]" aria-label="notifications">
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
