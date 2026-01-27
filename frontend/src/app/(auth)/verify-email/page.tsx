import { Suspense } from "react"
import VerifyEmailClient from "./verify-email-client"

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">불러오는 중...</div>}>
      <VerifyEmailClient />
    </Suspense>
  )
}

