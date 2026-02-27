"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function LegacyEditorRedirectPage() {
  const router = useRouter()
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  useEffect(() => {
    if (!projectId) return
    router.replace(`/projects/${projectId}/editor`)
  }, [projectId, router])

  return null
}

