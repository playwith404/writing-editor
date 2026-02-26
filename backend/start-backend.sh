#!/usr/bin/env bash
set -euo pipefail

echo "[backend] starting core (port 3000)"
cd /app/core && export PYTHONPATH=$PYTHONPATH:. && uvicorn app.main:app --host 0.0.0.0 --port 3000 &
CORE_PID=$!

echo "[backend] starting ai (port 8000)"
cd /app/ai && export PYTHONPATH=$PYTHONPATH:. && uvicorn app.main:app --host 0.0.0.0 --port 8000 &
AI_PID=$!

cleanup() {
  echo "[backend] stopping processes..."
  kill -TERM "$CORE_PID" "$AI_PID" 2>/dev/null || true
  wait || true
}

trap cleanup INT TERM

wait -n "$CORE_PID" "$AI_PID"
EXIT_CODE=$?
echo "[backend] a process exited (code=$EXIT_CODE); shutting down..."
cleanup
exit "$EXIT_CODE"

