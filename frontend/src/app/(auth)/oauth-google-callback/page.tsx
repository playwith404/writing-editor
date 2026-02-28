import { Suspense } from "react"

import OauthGoogleCallbackClient from "./oauth-google-callback-client"

export default function OauthGoogleCallbackPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">구글 로그인 처리 중...</div>}>
      <OauthGoogleCallbackClient />
    </Suspense>
  )
}
