# Gleey Dev Deploy

## 1) Server Preparation
- Install Docker + Docker Compose v2
- Create `/srv/gleey`
- Prepare `/srv/gleey/.env` based on repo-root `.env.example`

## 2) Required Environment Variables (`.env`)
Use `.env.example` at the repo root and copy the same values into `/srv/gleey/.env`.

```env
# Common
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=gleey
DB_PASSWORD=replace_me
DB_NAME=gleey
JWT_SECRET=replace_me
REDIS_URL=redis://redis:6379
ELASTICSEARCH_NODE=http://host.docker.internal:9200

# Frontend (optional)
NEXT_PUBLIC_API_URL=http://localhost:8100
NEXT_PUBLIC_WS_URL=ws://localhost:8102/ws

# AI
AI_MODE=mock
AI_HTTP_TIMEOUT_SECONDS=60
GEMINI_API_KEY=replace_me
GEMINI_MODEL=gemini-3-flash-preview
```

## 3) Deploy Command (Local Test)
```bash
cd /srv/gleey
docker compose -f deploy/docker-compose.dev.yml up -d --build
```

## 4) AI Runtime Quick Start (Gemini)
You can switch between mock and live modes using only `.env` values.

```env
# Dev/Test (mock)
AI_MODE=mock
GEMINI_MODEL=gemini-3-flash-preview

# Real Gemini call (live)
# AI_MODE=live
# GEMINI_API_KEY=your_real_key
# GEMINI_MODEL=gemini-3-flash-preview
# AI_HTTP_TIMEOUT_SECONDS=60
```

Notes:
- In `AI_MODE=live`, missing keys return a 502 error with a clear reason.
- In `AI_MODE=mock`, no external LLM call is made and mock responses are returned.

## 5) Local Test Workflow (Docker Desktop)
```powershell
Copy-Item .env.example .env

docker compose -f deploy/docker-compose.local-deps.yml --env-file .env up -d
powershell -ExecutionPolicy Bypass -File deploy/init-local-db.ps1

docker compose -f deploy/docker-compose.dev.yml --env-file .env up -d --build
Invoke-RestMethod http://localhost:8101/health

powershell -ExecutionPolicy Bypass -File deploy/local-smoke-ai14.ps1
```
