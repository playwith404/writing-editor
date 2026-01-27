import { Suspense } from "react"
import ForgotPasswordClient from "./forgot-password-client"

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">불러오는 중...</div>}>
      <ForgotPasswordClient />
    </Suspense>
  )
}

