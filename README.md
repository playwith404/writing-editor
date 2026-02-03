# Cowrite (dev)

This repo contains frontend + backend services and a CI/CD pipeline that deploys to the dev server via SSH (no DockerHub).

## Services
- `backend/core`: Spring Boot core API
- `backend/sync`: Spring WebSocket sync service
- `backend/ai`: FastAPI AI service
- `frontend`: Next.js frontend

## CI/CD
GitHub Actions workflow: `.github/workflows/deploy-dev.yml`

Required GitHub Secrets:
- `SSH_HOST`
- `SSH_USER`
- `SSH_KEY`
- `SSH_PORT`
- `SSH_KNOWN_HOSTS` (optional)

The workflow connects to `/srv/cowrite`, pulls the `dev` branch, and runs:
```
docker compose -f deploy/docker-compose.dev.yml up -d --build
```

## Local dev
```
cd backend/core
gradle bootRun
```
