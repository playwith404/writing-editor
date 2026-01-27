import { Suspense } from "react"
import ConfirmEmailChangeClient from "./confirm-email-change-client"

export default function ConfirmEmailChangePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">불러오는 중...</div>}>
      <ConfirmEmailChangeClient />
    </Suspense>
  )
}

