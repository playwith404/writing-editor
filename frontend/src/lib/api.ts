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
    logout: () => apiFetch<{ success: true }>("/auth/logout", { method: "POST" }),
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
  },
  documents: {
    list: (projectId: string) => apiFetch<any[]>(`/documents?projectId=${encodeURIComponent(projectId)}`),
    get: (id: string) => apiFetch<any>(`/documents/${id}`),
    create: (dto: any) => apiFetch<any>("/documents", { method: "POST", body: dto }),
    update: (id: string, dto: any) => apiFetch<any>(`/documents/${id}`, { method: "PATCH", body: dto }),
  },
  characters: {
    list: (projectId: string) => apiFetch<any[]>(`/characters?projectId=${encodeURIComponent(projectId)}`),
  },
  worldSettings: {
    list: (projectId: string) => apiFetch<any[]>(`/world-settings?projectId=${encodeURIComponent(projectId)}`),
  },
  stats: {
    project: (projectId: string) => apiFetch<any>(`/stats/projects/${projectId}`),
  },
  ai: {
    quota: () => apiFetch<{ limit: number | null; used: number; remaining: number | null }>("/ai/quota"),
    complete: (dto: any) => apiFetch<{ content: string }>("/ai/complete", { method: "POST", body: dto }),
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
