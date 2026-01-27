import { Suspense } from "react"
import BetaInviteClient from "./beta-invite-client"

export default function BetaInvitePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">불러오는 중...</div>}>
      <BetaInviteClient />
    </Suspense>
  )
}

