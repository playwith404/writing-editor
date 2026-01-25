# Cowrite Dev Deploy

## 1) 서버 준비
- Docker + Docker Compose v2 설치
- `/srv/cowrite` 디렉터리 생성
- `/srv/cowrite/.env` 준비 (레포 루트 기준)

## 2) 필수 환경변수 (.env)
`.env.example`을 레포 루트에 두었고, 동일한 내용을 `/srv/cowrite/.env`로 복사해서 사용합니다.
```
# 공통
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=cowrite
DB_PASSWORD=replace_me
DB_NAME=cowrite
JWT_SECRET=replace_me
REDIS_URL=redis://redis:6379
ELASTICSEARCH_NODE=http://host.docker.internal:9200

# AI 서비스
OPENAI_API_KEY=replace_me
ANTHROPIC_API_KEY=replace_me
GEMINI_API_KEY=replace_me
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
GEMINI_MODEL=gemini-1.5-pro
```

## 3) 배포 명령(로컬에서 테스트)
```
cd /srv/cowrite
cp /path/to/docker-compose.dev.yml ./
docker compose -f docker-compose.dev.yml pull
docker compose -f docker-compose.dev.yml up -d
```
