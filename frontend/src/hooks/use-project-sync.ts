"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getAccessToken } from "@/lib/auth"

function getWsBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_WS_URL?.trim()
  if (env) return env
  if (typeof window === "undefined") return "ws://localhost:8102/ws"
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  return `${protocol}//${window.location.host}/ws`
}

type ContentSyncPayload = { documentId?: string; content?: string }

export function useProjectSync({
  projectId,
  onContentSync,
}: {
  projectId: string
  onContentSync?: (payload: ContentSyncPayload) => void
}) {
  const socketRef = useRef<WebSocket | null>(null)
  const socketTokenRef = useRef<string | null>(null)
  const joinedProjectIdRef = useRef<string | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const presence = useRef<Set<string>>(new Set())
  const onContentSyncRef = useRef<typeof onContentSync>(onContentSync)

  const [token, setToken] = useState<string | null>(() => getAccessToken())
  const tokenRef = useRef<string | null>(token)

  const [connected, setConnected] = useState(false)
  const [presenceCount, setPresenceCount] = useState(1)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    onContentSyncRef.current = onContentSync
  }, [onContentSync])

  useEffect(() => {
    tokenRef.current = token
  }, [token])

  useEffect(() => {
    if (typeof window === "undefined") return

    const update = () => setToken(getAccessToken())
    update()

    const onStorage = (e: StorageEvent) => {
      if (e.key === "cowrite.accessToken" || e.key === "cowrite.refreshToken") {
        update()
      }
    }
    const onAuth = () => update()

    window.addEventListener("storage", onStorage)
    window.addEventListener("cowrite.auth", onAuth)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("cowrite.auth", onAuth)
    }
  }, [])

  const send = useCallback((message: any) => {
    const sock = socketRef.current
    if (!sock || sock.readyState !== WebSocket.OPEN) return
    sock.send(JSON.stringify(message))
  }, [])

  const cleanupSocket = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    reconnectTimer.current = null

    const sock = socketRef.current
    socketRef.current = null
    socketTokenRef.current = null
    joinedProjectIdRef.current = null

    try {
      sock?.close()
    } catch {
      // ignore
    }

    presence.current = new Set()
    setPresenceCount(1)
    setConnected(false)
  }, [])

  const connect = useCallback(() => {
    const currentToken = tokenRef.current
    if (!currentToken) return
    if (!projectId) return
    if (
      socketRef.current &&
      socketRef.current.readyState === WebSocket.OPEN &&
      socketTokenRef.current === currentToken &&
      joinedProjectIdRef.current === projectId
    ) {
      return
    }

    if (socketRef.current) {
      try {
        socketRef.current.close()
      } catch {
        // ignore
      }
      socketRef.current = null
      socketTokenRef.current = null
      joinedProjectIdRef.current = null
    }

    const url = new URL(getWsBaseUrl(), typeof window !== "undefined" ? window.location.href : "http://localhost")
    url.searchParams.set("token", currentToken)

    const ws = new WebSocket(url.toString())
    socketRef.current = ws
    socketTokenRef.current = currentToken

    ws.onopen = () => {
      setConnected(true)
      setLastError(null)
      joinedProjectIdRef.current = projectId
      send({ type: "join", projectId, token: currentToken })
    }

    ws.onclose = () => {
      setConnected(false)
      presence.current = new Set()
      setPresenceCount(1)

      // cleanupSocket() 등으로 이미 소켓을 정리한 경우에는 재연결하지 않음
      if (socketRef.current !== ws) return

      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      reconnectTimer.current = setTimeout(() => connect(), 1000)
    }

    ws.onerror = () => {
      setLastError("동기화 연결에 실패했습니다.")
    }

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(String(evt.data))
        const type = data?.type as string | undefined

        if (type === "error") {
          setLastError(String(data?.message || "동기화 오류가 발생했습니다."))
          return
        }

        if (type === "presence:join") {
          if (data?.userId) presence.current.add(String(data.userId))
          setPresenceCount(Math.max(presence.current.size, 1))
          return
        }

        if (type === "presence:leave") {
          if (data?.userId) presence.current.delete(String(data.userId))
          setPresenceCount(Math.max(presence.current.size, 1))
          return
        }

        if (type === "content:sync") {
          onContentSyncRef.current?.(data?.payload ?? {})
          return
        }
      } catch {
        // ignore
      }
    }
  }, [projectId, send])

  useEffect(() => {
    if (!token) {
      cleanupSocket()
      return
    }

    connect()
    return () => {
      cleanupSocket()
    }
  }, [token, connect, cleanupSocket])

  const sendContentOp = useCallback(
    (payload: any) => {
      send({ type: "content:op", payload })
    },
    [send],
  )

  return { connected, presenceCount, lastError, sendContentOp }
}
