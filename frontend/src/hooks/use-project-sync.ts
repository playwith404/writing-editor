"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const presence = useRef<Set<string>>(new Set())

  const [connected, setConnected] = useState(false)
  const [presenceCount, setPresenceCount] = useState(1)
  const [lastError, setLastError] = useState<string | null>(null)

  const token = useMemo(() => getAccessToken(), [])

  const send = useCallback((message: any) => {
    const sock = socketRef.current
    if (!sock || sock.readyState !== WebSocket.OPEN) return
    sock.send(JSON.stringify(message))
  }, [])

  const connect = useCallback(() => {
    if (!token) return
    if (!projectId) return
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return

    const url = new URL(getWsBaseUrl(), typeof window !== "undefined" ? window.location.href : "http://localhost")
    url.searchParams.set("token", token)

    const ws = new WebSocket(url.toString())
    socketRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setLastError(null)
      send({ type: "join", projectId, token })
    }

    ws.onclose = () => {
      setConnected(false)
      presence.current = new Set()
      setPresenceCount(1)

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
          onContentSync?.(data?.payload ?? {})
          return
        }
      } catch {
        // ignore
      }
    }
  }, [token, projectId, onContentSync, send])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
      const sock = socketRef.current
      socketRef.current = null
      try {
        sock?.close()
      } catch {
        // ignore
      }
    }
  }, [connect])

  const sendContentOp = useCallback(
    (payload: any) => {
      send({ type: "content:op", payload })
    },
    [send],
  )

  return { connected, presenceCount, lastError, sendContentOp }
}

