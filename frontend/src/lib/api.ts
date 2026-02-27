import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth"

type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE"

type CoreEnvelope<T> = {
  success: boolean
  message?: string
  data: T
  total_count?: number
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (base) return base.replace(/\/$/, "")
  return "/api"
}

function parseResponseData(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>
    if (typeof record.message === "string" && record.message.trim()) return record.message
    if (typeof record.error === "string" && record.error.trim()) return record.error
  }

  if (typeof data === "string") {
    const normalized = data
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    if (normalized) return normalized.slice(0, 180)
  }

  return fallback
}

async function apiFetch<T>(path: string, init?: { method?: ApiMethod; body?: any; headers?: Record<string, string> }, retry = true): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`

  const accessToken = getAccessToken()
  const headers: Record<string, string> = {
    ...(init?.headers ?? {}),
  }
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  if (init?.body !== undefined && !headers["Content-Type"]) headers["Content-Type"] = "application/json"

  const resp = await fetch(url, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })

  const text = await resp.text()
  const data = parseResponseData(text)

  if (resp.status === 401 && retry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return apiFetch<T>(path, init, false)
    }
  }

  if (!resp.ok) {
    const message = extractErrorMessage(data, resp.statusText || "요청에 실패했습니다.")
    throw new ApiError(String(message), resp.status, data)
  }

  return data as T
}

async function apiUpload<T>(path: string, formData: FormData, retry = true): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`
  const accessToken = getAccessToken()
  const headers: Record<string, string> = {}
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  })

  const text = await resp.text()
  const data = parseResponseData(text)

  if (resp.status === 401 && retry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return apiUpload<T>(path, formData, false)
    }
  }

  if (!resp.ok) {
    const message = extractErrorMessage(data, resp.statusText || "요청에 실패했습니다.")
    throw new ApiError(String(message), resp.status, data)
  }

  return data as T
}

function parseFilenameFromDisposition(value: string | null): string | null {
  if (!value) return null
  // content-disposition: attachment; filename="file.txt"
  const match = /filename\\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i.exec(value)
  const raw = match?.[1] || match?.[2]
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

async function apiDownload(
  path: string,
  init?: { method?: ApiMethod; body?: any; headers?: Record<string, string> },
  retry = true
): Promise<{ blob: Blob; filename: string; contentType: string | null }> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`

  const accessToken = getAccessToken()
  const headers: Record<string, string> = {
    ...(init?.headers ?? {}),
  }
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`

  const resp = await fetch(url, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })

  if (resp.status === 401 && retry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return apiDownload(path, init, false)
    }
  }

  if (!resp.ok) {
    const text = await resp.text()
    const data = parseResponseData(text)
    const message = extractErrorMessage(data, resp.statusText || "요청에 실패했습니다.")
    throw new ApiError(String(message), resp.status, data)
  }

  const blob = await resp.blob()
  const contentType = resp.headers.get("content-type")
  const filename = parseFilenameFromDisposition(resp.headers.get("content-disposition")) || "download"
  return { blob, filename, contentType }
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    clearTokens()
    return false
  }

  try {
    const url = `${getApiBaseUrl()}/auth/refresh`
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!resp.ok) throw new Error("refresh failed")
    const data = (await resp.json()) as { accessToken: string; refreshToken: string }
    if (!data?.accessToken || !data?.refreshToken) throw new Error("invalid tokens")
    setTokens(data)
    return true
  } catch {
    clearTokens()
    return false
  }
}

function toIso(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  return value
}

function mapCoreProject(raw: any) {
  return {
    id: String(raw?.id ?? ""),
    title: String(raw?.title ?? ""),
    createdAt: toIso(raw?.created_at),
    updatedAt: toIso(raw?.updated_at),
    settings: raw?.settings,
  }
}

function mapCoreEpisodeListItem(raw: any) {
  return {
    id: String(raw?.id ?? ""),
    projectId: String(raw?.project_id ?? raw?.projectId ?? ""),
    title: String(raw?.title ?? ""),
    orderIndex: Number(raw?.order_index ?? raw?.orderIndex ?? 0),
    status: String(raw?.status ?? "TODO"),
    charCount: Number(raw?.char_count ?? raw?.charCount ?? 0),
    updatedAt: toIso(raw?.updated_at),
  }
}

function mapCoreEpisodeDetail(raw: any) {
  return {
    ...mapCoreEpisodeListItem(raw),
    charCountNoSpace: Number(raw?.char_count_no_space ?? raw?.charCountNoSpace ?? 0),
    content: raw?.content ?? null,
    createdAt: toIso(raw?.created_at),
  }
}

function mapCoreCharacter(raw: any) {
  const job = raw?.job ?? null
  return {
    id: String(raw?.id ?? ""),
    projectId: String(raw?.project_id ?? raw?.projectId ?? ""),
    name: String(raw?.name ?? ""),
    imageUrl: typeof raw?.image_url === "string" ? raw.image_url : undefined,
    job: typeof job === "string" ? job : undefined,
    role: typeof job === "string" ? job : undefined,
    personality: Array.isArray(raw?.personality) ? raw.personality : [],
    description: typeof raw?.description === "string" ? raw.description : undefined,
    isSynced: typeof raw?.is_synced === "boolean" ? raw.is_synced : undefined,
    createdAt: toIso(raw?.created_at),
    updatedAt: toIso(raw?.updated_at),
  }
}

function mapCoreWorldview(raw: any) {
  return {
    id: String(raw?.id ?? ""),
    projectId: String(raw?.project_id ?? raw?.projectId ?? ""),
    name: String(raw?.name ?? ""),
    description: typeof raw?.description === "string" ? raw.description : undefined,
    type: String(raw?.type ?? ""),
    isSynced: typeof raw?.is_synced === "boolean" ? raw.is_synced : undefined,
    createdAt: toIso(raw?.created_at),
    updatedAt: toIso(raw?.updated_at),
  }
}

function mapCoreTerm(raw: any) {
  return {
    id: String(raw?.id ?? ""),
    worldviewId: String(raw?.worldview_id ?? raw?.worldviewId ?? ""),
    term: String(raw?.term ?? ""),
    meaning: String(raw?.meaning ?? ""),
    createdAt: toIso(raw?.created_at),
  }
}

export const api = {
  auth: {
    login: (dto: { email: string; password: string }) =>
      apiFetch<{ accessToken: string; refreshToken: string }>("/auth/login", { method: "POST", body: dto }),
    register: (dto: { email: string; name: string; password: string }) =>
      apiFetch<{ accessToken: string; refreshToken: string } | { success: true; message?: string }>("/auth/register", { method: "POST", body: dto }),
    verifyEmail: (dto: { token: string }) =>
      apiFetch<{ accessToken: string; refreshToken: string }>("/auth/verify-email", { method: "POST", body: dto }),
    resendVerification: (dto: { email: string }) =>
      apiFetch<{ success: true; message?: string }>("/auth/resend-verification", { method: "POST", body: dto }),
    me: () => apiFetch<any>("/auth/me"),
    requestPasswordReset: (dto: { email: string }) =>
      apiFetch<{ success: true; message?: string }>("/auth/request-password-reset", { method: "POST", body: dto }),
    resetPassword: (dto: { token: string; newPassword: string }) =>
      apiFetch<{ success: true }>("/auth/reset-password", { method: "POST", body: dto }),
    changePassword: (dto: { currentPassword: string; newPassword: string }) =>
      apiFetch<{ success: true }>("/auth/change-password", { method: "POST", body: dto }),
    requestEmailChange: (dto: { newEmail: string }) =>
      apiFetch<{ success: true; message?: string }>("/auth/request-email-change", { method: "POST", body: dto }),
    confirmEmailChange: (dto: { token: string }) =>
      apiFetch<{ accessToken: string; refreshToken: string }>("/auth/confirm-email-change", { method: "POST", body: dto }),
    updateMe: (dto: { name?: string; avatarUrl?: string }) =>
      apiFetch<any>("/auth/me", { method: "PATCH", body: dto }),
    sessions: () => apiFetch<any[]>("/auth/sessions"),
    revokeSession: (id: string) => apiFetch<{ success: true }>(`/auth/sessions/${id}`, { method: "DELETE" }),
    deleteAccount: (dto: { password?: string }) => apiFetch<{ success: true }>("/auth/delete-account", { method: "POST", body: dto }),
    logout: () => apiFetch<{ success: true }>("/auth/logout", { method: "POST" }),
  },
  media: {
    upload: (file: File, dto?: { projectId?: string }) => {
      const fd = new FormData()
      fd.append("file", file)
      if (dto?.projectId) fd.append("projectId", dto.projectId)
      return apiUpload<{ id: string; url: string; mimeType: string; size: number }>("/media/upload", fd)
    },
  },
  billing: {
    plans: () => apiFetch<any[]>("/billing/plans"),
    subscription: () => apiFetch<any>("/billing/subscription"),
    subscribe: (dto: { plan: "free" | "pro" | "master" }) => apiFetch<any>("/billing/subscribe", { method: "POST", body: dto }),
  },
  projects: {
    list: async () => {
      const resp = await apiFetch<CoreEnvelope<any[]>>("/projects")
      return (resp.data ?? []).map(mapCoreProject)
    },
    get: async (id: string) => {
      const projects = await api.projects.list()
      const found = projects.find((p) => p.id === id)
      if (!found) throw new ApiError("프로젝트를 찾을 수 없습니다.", 404, null)
      return found
    },
    create: async (dto: { title: string }) => {
      const resp = await apiFetch<CoreEnvelope<any>>("/projects", { method: "POST", body: { title: dto.title } })
      return mapCoreProject(resp.data)
    },
    update: async (_id: string, _dto: any) => {
      throw new ApiError("프로젝트 업데이트 API가 아직 구현되지 않았습니다.", 501, null)
    },
  },
  documents: {
    list: (projectId: string) => apiFetch<any[]>(`/documents?projectId=${encodeURIComponent(projectId)}`),
    get: (id: string) => apiFetch<any>(`/documents/${id}`),
    create: (dto: any) => apiFetch<any>("/documents", { method: "POST", body: dto }),
    update: (id: string, dto: any) => apiFetch<any>(`/documents/${id}`, { method: "PATCH", body: dto }),
    delete: (id: string) => apiFetch<{ success: true }>(`/documents/${id}`, { method: "DELETE" }),
  },
  documentVersions: {
    list: (documentId: string) => apiFetch<any[]>(`/document-versions?documentId=${encodeURIComponent(documentId)}`),
    create: (dto: any) => apiFetch<any>("/document-versions", { method: "POST", body: dto }),
    restore: (id: string) => apiFetch<any>(`/document-versions/${id}/restore`, { method: "POST" }),
    delete: (id: string) => apiFetch<{ success: true }>(`/document-versions/${id}`, { method: "DELETE" }),
  },
  writingGoals: {
    list: (projectId: string) => apiFetch<any[]>(`/writing-goals?projectId=${encodeURIComponent(projectId)}`),
    create: (dto: any) => apiFetch<any>("/writing-goals", { method: "POST", body: dto }),
    update: (id: string, dto: any) => apiFetch<any>(`/writing-goals/${id}`, { method: "PATCH", body: dto }),
    delete: (id: string) => apiFetch<{ success: true }>(`/writing-goals/${id}`, { method: "DELETE" }),
  },
  characterStats: {
    templates: () => apiFetch<any[]>("/character-stats/templates"),
    calculate: (dto: { templateType?: string; stats?: any }) => apiFetch<any>("/character-stats/calculate", { method: "POST", body: dto }),
    list: (characterId: string) => apiFetch<any[]>(`/character-stats?characterId=${encodeURIComponent(characterId)}`),
    progression: (characterId: string) => apiFetch<any[]>(`/character-stats/progression?characterId=${encodeURIComponent(characterId)}`),
    consistency: (characterId: string) => apiFetch<any[]>(`/character-stats/consistency?characterId=${encodeURIComponent(characterId)}`),
    create: (dto: any) => apiFetch<any>("/character-stats", { method: "POST", body: dto }),
    update: (id: string, dto: any) => apiFetch<any>(`/character-stats/${id}`, { method: "PATCH", body: dto }),
    delete: (id: string) => apiFetch<{ success: true }>(`/character-stats/${id}`, { method: "DELETE" }),
  },
  characters: {
    list: async (projectId: string) => {
      const resp = await apiFetch<CoreEnvelope<any[]>>(`/projects/${encodeURIComponent(projectId)}/characters`)
      return (resp.data ?? []).map(mapCoreCharacter)
    },
    create: async (dto: { projectId: string; name: string; role?: string; imageUrl?: string; description?: string; isSynced?: boolean }) => {
      const resp = await apiFetch<CoreEnvelope<any>>(`/projects/${encodeURIComponent(dto.projectId)}/characters`, {
        method: "POST",
        body: {
          name: dto.name,
          image_url: dto.imageUrl,
          job: dto.role,
          personality: [],
          description: dto.description,
          is_synced: dto.isSynced ?? true,
        },
      })
      return mapCoreCharacter(resp.data)
    },
    update: async (id: string, dto: any) => {
      const resp = await apiFetch<CoreEnvelope<any>>(`/characters/${encodeURIComponent(id)}`, { method: "PATCH", body: dto })
      return mapCoreCharacter(resp.data)
    },
    delete: (id: string) => apiFetch<{ success: true }>(`/characters/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },
  worldviews: {
    list: async (projectId: string, opts?: { isSynced?: boolean }) => {
      const qs = typeof opts?.isSynced === "boolean" ? `?is_synced=${encodeURIComponent(String(opts.isSynced))}` : ""
      const resp = await apiFetch<CoreEnvelope<any[]>>(`/projects/${encodeURIComponent(projectId)}/worldviews${qs}`)
      return (resp.data ?? []).map(mapCoreWorldview)
    },
    create: async (projectId: string, dto: { name: string; description?: string; type: string; isSynced?: boolean }) => {
      const resp = await apiFetch<CoreEnvelope<any>>(`/projects/${encodeURIComponent(projectId)}/worldviews`, {
        method: "POST",
        body: {
          name: dto.name,
          description: dto.description,
          type: dto.type,
          is_synced: dto.isSynced ?? true,
        },
      })
      return mapCoreWorldview(resp.data)
    },
    terms: {
      list: async (worldviewId: string) => {
        const resp = await apiFetch<CoreEnvelope<any[]>>(`/worldviews/${encodeURIComponent(worldviewId)}/terms`)
        return (resp.data ?? []).map(mapCoreTerm)
      },
      create: async (worldviewId: string, dto: { term: string; meaning: string }) => {
        const resp = await apiFetch<CoreEnvelope<any>>(`/worldviews/${encodeURIComponent(worldviewId)}/terms`, { method: "POST", body: dto })
        return mapCoreTerm(resp.data)
      },
    },
    relationships: {
      list: async (worldviewId: string, characterId: string) => {
        return apiFetch<any>(`/worldviews/${encodeURIComponent(worldviewId)}/relationships?character_id=${encodeURIComponent(characterId)}`)
      },
      create: async (worldviewId: string, dto: { baseCharacterId: string; targetCharacterId: string; relationType?: string; color?: string }) => {
        return apiFetch<any>(`/worldviews/${encodeURIComponent(worldviewId)}/relationships`, {
          method: "POST",
          body: {
            base_character_id: dto.baseCharacterId,
            target_character_id: dto.targetCharacterId,
            relation_type: dto.relationType,
            color: dto.color,
          },
        })
      },
    },
    entries: {
      create: async (worldviewId: string, dto: { title: string; content?: any }) => {
        return apiFetch<any>(`/worldviews/${encodeURIComponent(worldviewId)}/entries`, { method: "POST", body: dto })
      },
    },
  },
  episodes: {
    list: async (projectId: string) => {
      const resp = await apiFetch<CoreEnvelope<any[]>>(`/projects/${encodeURIComponent(projectId)}/episodes`)
      return (resp.data ?? []).map(mapCoreEpisodeListItem)
    },
    create: async (projectId: string, dto: { title: string; orderIndex: number }) => {
      const resp = await apiFetch<CoreEnvelope<any>>(`/projects/${encodeURIComponent(projectId)}/episodes`, {
        method: "POST",
        body: { title: dto.title, order_index: dto.orderIndex },
      })
      return mapCoreEpisodeDetail(resp.data)
    },
    get: async (episodeId: string) => {
      const resp = await apiFetch<CoreEnvelope<any>>(`/episodes/${encodeURIComponent(episodeId)}`)
      return mapCoreEpisodeDetail(resp.data)
    },
    save: async (episodeId: string, dto: { content?: any; status?: string; charCount?: number; charCountNoSpace?: number; title?: string; orderIndex?: number }) => {
      const payload: any = {}
      if (dto.content !== undefined) payload.content = dto.content
      if (dto.status !== undefined) payload.status = dto.status
      if (dto.charCount !== undefined) payload.char_count = dto.charCount
      if (dto.charCountNoSpace !== undefined) payload.char_count_no_space = dto.charCountNoSpace
      if (dto.title !== undefined) payload.title = dto.title
      if (dto.orderIndex !== undefined) payload.order_index = dto.orderIndex

      const resp = await apiFetch<any>(`/episodes/${encodeURIComponent(episodeId)}`, { method: "PATCH", body: payload })
      return {
        success: Boolean((resp as any)?.success ?? true),
        message: typeof (resp as any)?.message === "string" ? (resp as any).message : undefined,
        updatedAt: toIso((resp as any)?.updated_at),
      }
    },
  },
  worldSettings: {
    list: (projectId: string) => apiFetch<any[]>(`/world-settings?projectId=${encodeURIComponent(projectId)}`),
    create: (dto: { projectId: string; category: string; title: string; content?: string; metadata?: any }) =>
      apiFetch<any>("/world-settings", { method: "POST", body: dto }),
    update: (id: string, dto: any) => apiFetch<any>(`/world-settings/${id}`, { method: "PATCH", body: dto }),
    delete: (id: string) => apiFetch<{ success: true }>(`/world-settings/${id}`, { method: "DELETE" }),
  },
  stats: {
    project: (projectId: string) =>
      apiFetch<{
        projectId: string;
        documents: number;
        characters: number;
        worldSettings: number;
        plots: number;
        wordCount: number;
      }>(`/stats/projects/${projectId}`),
    dailyWords: (projectId: string, days = 30) =>
      apiFetch<{ projectId: string; days: number; series: any[] }>(
        `/stats/projects/${projectId}/daily?days=${encodeURIComponent(String(days))}`
      ),
  },
  plots: {
    list: (projectId: string) => apiFetch<any[]>(`/plots?projectId=${encodeURIComponent(projectId)}`),
    create: (dto: any) => apiFetch<any>("/plots", { method: "POST", body: dto }),
    update: (id: string, dto: any) => apiFetch<any>(`/plots/${id}`, { method: "PATCH", body: dto }),
    delete: (id: string) => apiFetch<any>(`/plots/${id}`, { method: "DELETE" }),
  },
  plotPoints: {
    list: (plotId: string) => apiFetch<any[]>(`/plot-points?plotId=${encodeURIComponent(plotId)}`),
    create: (dto: any) => apiFetch<any>("/plot-points", { method: "POST", body: dto }),
    update: (id: string, dto: any) => apiFetch<any>(`/plot-points/${id}`, { method: "PATCH", body: dto }),
    delete: (id: string) => apiFetch<{ success: true }>(`/plot-points/${id}`, { method: "DELETE" }),
  },
  relationships: {
    list: (projectId: string) => apiFetch<any[]>(`/relationships?projectId=${encodeURIComponent(projectId)}`),
    create: (dto: any) => apiFetch<any>("/relationships", { method: "POST", body: dto }),
    update: (id: string, dto: any) => apiFetch<any>(`/relationships/${id}`, { method: "PATCH", body: dto }),
    delete: (id: string) => apiFetch<{ success: true }>(`/relationships/${id}`, { method: "DELETE" }),
  },
  research: {
    list: (projectId: string) => apiFetch<any[]>(`/research-items?projectId=${encodeURIComponent(projectId)}`),
    create: (dto: any) => apiFetch<any>("/research-items", { method: "POST", body: dto }),
    update: (id: string, dto: any) => apiFetch<any>(`/research-items/${id}`, { method: "PATCH", body: dto }),
    delete: (id: string) => apiFetch<any>(`/research-items/${id}`, { method: "DELETE" }),
  },
  publishing: {
    list: (projectId: string) => apiFetch<any[]>(`/publishing-exports?projectId=${encodeURIComponent(projectId)}`),
    create: (dto: { projectId: string; exportFormat: string; documentId?: string }) =>
      apiFetch<any>("/publishing-exports", { method: "POST", body: dto }),
    download: (id: string) => apiDownload(`/publishing-exports/${id}/download`),
    deliver: (id: string, dto: { type?: "email"; to: string; subject?: string; message?: string }) =>
      apiFetch<any>(`/publishing-exports/${id}/deliver`, { method: "POST", body: dto }),
  },
  backups: {
    export: (projectId: string) => apiDownload(`/backups/projects/${projectId}/export`),
    import: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiUpload<{ success: true }>("/backups/import", fd);
    }
  },
  ai: {
    quota: () => apiFetch<{ limit: number | null; used: number; remaining: number | null }>("/ai/quota"),
    complete: (dto: any) => apiFetch<{ content: string }>("/ai/complete", { method: "POST", body: dto }),
    settingsSearch: (dto: any) => apiFetch<any>("/ai/settings-search", { method: "POST", body: dto }),
    styleConvert: (dto: any) => apiFetch<{ content: string }>("/ai/style/convert", { method: "POST", body: dto }),
    characterSimulate: (dto: any) => apiFetch<{ content: string }>("/ai/character/simulate", { method: "POST", body: dto }),
  },
  generators: {
    translate: (dto: any) => apiFetch<any>("/translations/generate", { method: "POST", body: dto }),
    research: (dto: any) => apiFetch<any>("/research-items/generate", { method: "POST", body: dto }),
    storyboard: (dto: any) => apiFetch<any>("/storyboards/generate", { method: "POST", body: dto }),
    predict: (dto: any) => apiFetch<any>("/reader-predictions/generate", { method: "POST", body: dto }),
    tts: (dto: any) => apiFetch<any>("/audio-assets/generate", { method: "POST", body: dto }),
  },
  betaSessions: {
    list: (projectId?: string) =>
      apiFetch<any[]>(`/beta-sessions${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`),
    get: (id: string) => apiFetch<any>(`/beta-sessions/${id}`),
    create: (dto: { projectId: string; documentId?: string; title: string; description?: string }) =>
      apiFetch<any>("/beta-sessions", { method: "POST", body: dto }),
    inviteInfo: (token: string) => apiFetch<any>(`/beta-sessions/invite?token=${encodeURIComponent(token)}`),
    join: (dto: { token: string }) => apiFetch<any>("/beta-sessions/join", { method: "POST", body: dto }),
    document: (sessionId: string) => apiFetch<any>(`/beta-sessions/${sessionId}/document`),
    participants: (sessionId: string) => apiFetch<any[]>(`/beta-sessions/${sessionId}/participants`),
  },
  betaFeedback: {
    list: (sessionId: string) => apiFetch<any[]>(`/beta-feedback?sessionId=${encodeURIComponent(sessionId)}`),
    create: (dto: any) => apiFetch<any>("/beta-feedback", { method: "POST", body: dto }),
    remove: (id: string) => apiFetch<{ success: true }>(`/beta-feedback/${id}`, { method: "DELETE" }),
  },
  betaReaders: {
    me: () => apiFetch<any>("/beta-readers/me"),
    upsertMe: (dto: any) => apiFetch<any>("/beta-readers/me", { method: "POST", body: dto }),
    recommendations: (projectId: string) => apiFetch<any[]>(`/beta-readers/recommendations?projectId=${encodeURIComponent(projectId)}`),
  },
  points: {
    balance: () => apiFetch<{ balance: number }>("/points/balance"),
    transactions: () => apiFetch<any[]>("/points/transactions"),
  },
}
