import { Suspense } from "react"
import BetaSessionClient from "./beta-session-client"

export default function BetaSessionPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">불러오는 중...</div>}>
      <BetaSessionClient />
    </Suspense>
  )
}

