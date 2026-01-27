import { Suspense } from "react"
import ResetPasswordClient from "./reset-password-client"

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">불러오는 중...</div>}>
      <ResetPasswordClient />
    </Suspense>
  )
}

