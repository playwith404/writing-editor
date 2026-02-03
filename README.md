# Cowrite (dev)

This repo contains frontend + backend services and a CI/CD pipeline that deploys to the dev server via SSH (no DockerHub).

## Services
- `backend/core`: Spring Boot core API
- `backend/sync`: Spring WebSocket sync service
- `backend/ai`: FastAPI AI service
- `frontend`: Next.js frontend

## CI/CD
GitHub Actions workflows:
- `.github/workflows/deploy-frontend-dev.yml` (auto on `dev` changes)
- `.github/workflows/deploy-backend-dev.yml` (auto on `dev` changes)
- `.github/workflows/deploy-dev.yml` (manual full deploy)

Required GitHub Secrets:
- `SSH_HOST`
- `SSH_USER`
- `SSH_KEY`
- `SSH_PORT`
- `SSH_KNOWN_HOSTS` (optional)

Workflows connect to `/srv/cowrite`, pull the `dev` branch, and run `docker compose` (or `docker-compose`) with:
```
docker compose -p cowrite -f deploy/docker-compose.dev.yml up -d --build
```

## Local dev
```
cd backend/core
gradle bootRun
```
