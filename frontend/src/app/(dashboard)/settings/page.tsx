import { Suspense } from "react"
import SettingsClient from "./settings-client"

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">불러오는 중...</div>}>
      <SettingsClient />
    </Suspense>
  )
}

