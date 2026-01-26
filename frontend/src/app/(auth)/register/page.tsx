import { Suspense } from "react"
import RegisterClient from "./register-client"

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">불러오는 중...</div>}>
      <RegisterClient />
    </Suspense>
  )
}

