# Cowrite Backend (dev)

This repo contains backend services (excluding frontend) and a CI/CD pipeline that tests, builds, pushes Docker images, and deploys to the dev server.

## Services
- `backend/core`: NestJS core API
- `backend/sync`: NestJS sync service
- `backend/ai`: FastAPI AI service

## CI/CD
GitHub Actions workflow: `.github/workflows/ci-cd-dev.yml`

Required GitHub Secrets:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `SSH_HOST`
- `SSH_USER`
- `SSH_KEY`
- `SSH_PORT`

Docker images are pushed to `ms9019/cowrtie` with tags:
- `core-dev-latest`, `core-dev-<sha>`
- `sync-dev-latest`, `sync-dev-<sha>`
- `ai-dev-latest`, `ai-dev-<sha>`

## Local dev
```
cd backend/core
npm install
npm run start:dev
```
