import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth"

type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE"

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
  const data = text ? JSON.parse(text) : null

  if (resp.status === 401 && retry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return apiFetch<T>(path, init, false)
    }
  }

  if (!resp.ok) {
    const message =
      (data && typeof data === "object" && ("message" in (data as any) ? (data as any).message : (data as any).error)) ||
      resp.statusText ||
      "요청에 실패했습니다."
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
  const data = text ? JSON.parse(text) : null

  if (resp.status === 401 && retry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return apiUpload<T>(path, formData, false)
    }
  }

  if (!resp.ok) {
    const message =
      (data && typeof data === "object" && ("message" in (data as any) ? (data as any).message : (data as any).error)) ||
      resp.statusText ||
      "요청에 실패했습니다."
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
    const data = text ? JSON.parse(text) : null
    const message =
      (data && typeof data === "object" && ("message" in (data as any) ? (data as any).message : (data as any).error)) ||
      resp.statusText ||
      "요청에 실패했습니다."
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
    list: () => apiFetch<any[]>("/projects"),
    get: (id: string) => apiFetch<any>(`/projects/${id}`),
    create: (dto: { title: string; description?: string; genre?: string }) => apiFetch<any>("/projects", { method: "POST", body: dto }),
    update: (id: string, dto: { title?: string; description?: string; genre?: string; coverUrl?: string; isPublic?: boolean; settings?: any }) =>
      apiFetch<any>(`/projects/${id}`, { method: "PATCH", body: dto }),
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
    list: (projectId: string) => apiFetch<any[]>(`/characters?projectId=${encodeURIComponent(projectId)}`),
    create: (dto: { projectId: string; name: string; role?: string; backstory?: string; speechSample?: string; imageUrl?: string }) =>
      apiFetch<any>("/characters", { method: "POST", body: dto }),
    update: (id: string, dto: any) => apiFetch<any>(`/characters/${id}`, { method: "PATCH", body: dto }),
    delete: (id: string) => apiFetch<{ success: true }>(`/characters/${id}`, { method: "DELETE" }),
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
