"use client"

import { useState } from "react"
import { Bell, Check, Shield, SlidersHorizontal, Users } from "lucide-react"

function SettingSwitch({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#d9e2ee] bg-white p-4">
      <div>
        <h3 className="text-base font-semibold text-[#1f2937]">{title}</h3>
        <p className="mt-1 text-sm text-[#7d6f62]">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={checked
          ? "relative h-7 w-14 rounded-full bg-[#938274]"
          : "relative h-7 w-14 rounded-full bg-[#d5dbe6]"
        }
        aria-pressed={checked}
      >
        <span
          className={checked
            ? "absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#938274]"
            : "absolute left-1 top-1 h-5 w-5 rounded-full bg-white"
          }
        >
          {checked ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
      </button>
    </div>
  )
}

export default function ProjectSettingsPage() {
  const [autoSave, setAutoSave] = useState(true)
  const [teamMode, setTeamMode] = useState(true)
  const [alertMode, setAlertMode] = useState(false)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[32px] font-bold text-[#111827]">작품 설정</h1>
        <p className="mt-2 text-lg text-[#7d6f62]">작가 모드 프로젝트의 편집 환경을 프론트에서 미리 구성합니다.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#d9e2ee] bg-white p-6">
          <div className="mb-4 inline-flex rounded-xl bg-[#f3eee7] p-3 text-[#8a7b6c]">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-[#1f2937]">집필 환경</h2>
          <p className="mt-2 text-sm leading-6 text-[#7d6f62]">문서 뷰, 자동 저장 주기, 초안 버전 정책을 설정합니다.</p>
        </div>

        <div className="rounded-2xl border border-[#d9e2ee] bg-white p-6">
          <div className="mb-4 inline-flex rounded-xl bg-[#f3eee7] p-3 text-[#8a7b6c]">
            <Shield className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-[#1f2937]">권한 정책</h2>
          <p className="mt-2 text-sm leading-6 text-[#7d6f62]">협업자 권한, 열람 범위, 편집 제약 조건을 정의합니다.</p>
        </div>
      </section>

      <section className="space-y-3">
        <SettingSwitch
          title="자동 저장"
          description="입력 중인 원고를 10초 간격으로 로컬에 자동 저장합니다."
          checked={autoSave}
          onChange={setAutoSave}
        />
        <SettingSwitch
          title="협업 모드"
          description="팀원이 동시에 캐릭터/플롯 보드를 편집할 수 있습니다."
          checked={teamMode}
          onChange={setTeamMode}
        />
        <SettingSwitch
          title="알림 요약"
          description="변경 사항 요약 알림을 사이드바 하단에 표시합니다."
          checked={alertMode}
          onChange={setAlertMode}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#d9e2ee] bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-[#1f2937]">
            <Users className="h-4 w-4 text-[#8a7b6c]" />
            COLLABORATION
          </h3>
          <p className="mt-3 text-sm text-[#7d6f62]">현재 4명의 협업자가 연결되어 있습니다. 역할별 권한은 다음 스프린트에서 확장합니다.</p>
        </div>

        <div className="rounded-2xl border border-[#d9e2ee] bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-[#1f2937]">
            <Bell className="h-4 w-4 text-[#8a7b6c]" />
            ALERTS
          </h3>
          <p className="mt-3 text-sm text-[#7d6f62]">씬 작성량, 캐릭터 변경, 관계성 업데이트 알림을 화면 우측 패널에 표시합니다.</p>
        </div>
      </section>
    </div>
  )
}
