# Cowrite Dev Deploy

## 1) 서버 준비
- Docker + Docker Compose v2 설치
- `/srv/cowrite` 디렉터리 생성
- `/srv/cowrite/.env` 준비

## 2) 필수 환경변수 (.env)
```
# 공통
DATABASE_URL=postgresql://cowrite:password@host.docker.internal:5432/cowrite_db
JWT_SECRET=replace_me
REDIS_URL=redis://redis:6379

# AI 서비스
OPENAI_API_KEY=replace_me
ANTHROPIC_API_KEY=replace_me
```

## 3) 배포 명령(로컬에서 테스트)
```
cd /srv/cowrite
cp /path/to/docker-compose.dev.yml ./
docker compose -f docker-compose.dev.yml pull
docker compose -f docker-compose.dev.yml up -d
```
