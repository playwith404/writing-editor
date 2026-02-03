#!/usr/bin/env bash
set -euo pipefail

echo "[backend] starting core (port 3000)"
java ${JAVA_OPTS:-} -jar /app/core.jar &
CORE_PID=$!

echo "[backend] starting sync (port 3001)"
PORT=3001 java ${JAVA_OPTS:-} -jar /app/sync.jar &
SYNC_PID=$!

echo "[backend] starting ai (port 8000)"
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
AI_PID=$!

cleanup() {
  echo "[backend] stopping processes..."
  kill -TERM "$CORE_PID" "$SYNC_PID" "$AI_PID" 2>/dev/null || true
  wait || true
}

trap cleanup INT TERM

wait -n "$CORE_PID" "$SYNC_PID" "$AI_PID"
EXIT_CODE=$?
echo "[backend] a process exited (code=$EXIT_CODE); shutting down..."
cleanup
exit "$EXIT_CODE"

