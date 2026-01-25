# ☁️ Cowrite 인프라/배포 설계

> Docker Compose 기반 로컬/서버 배포 환경을 정의합니다.

---

## 1. 인프라 구성 개요

```
┌─────────────────────────────────────────────────────────────┐
│                       서버 (Host)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Docker Compose                          │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐          │    │
│  │  │ Frontend  │ │ Core API  │ │ AI Service│          │    │
│  │  │  :3100    │ │  :8100    │ │  :8101    │          │    │
│  │  └───────────┘ └───────────┘ └───────────┘          │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐          │    │
│  │  │Sync Svc   │ │  Redis    │ │  Nginx    │          │    │
│  │  │  :8102    │ │  :6379    │ │  :80/443  │          │    │
│  │  └───────────┘ └───────────┘ └───────────┘          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          PostgreSQL (직접 설치)                       │    │
│  │               :5432                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 포트 구성

| 서비스 | 포트 | 설명 |
|--------|------|------|
| **Frontend** | 3100 | Next.js 웹 앱 |
| **Core API** | 8100 | NestJS 메인 API |
| **AI Service** | 8101 | FastAPI AI 서비스 |
| **Sync Service** | 8102 | WebSocket 실시간 |
| **Media Service** | 8103 | 파일 업로드 (확장) |
| **PostgreSQL** | 5432 | DB (직접 설치) |
| **Redis** | 6379 | 캐시 (Docker) |
| **Nginx** | 80, 443 | 리버스 프록시 |

---

## 3. 데이터베이스 (직접 설치)

### 3.1 PostgreSQL 설치

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# 서비스 시작
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3.2 데이터베이스 생성

```bash
sudo -u postgres psql

-- 사용자 생성
CREATE USER cowrite WITH PASSWORD 'your_secure_password';

-- 데이터베이스 생성
CREATE DATABASE cowrite OWNER cowrite;

-- 권한 부여
GRANT ALL PRIVILEGES ON DATABASE cowrite TO cowrite;

-- UUID 확장 활성화
\c cowrite
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 3.3 접속 설정

```bash
# /etc/postgresql/16/main/postgresql.conf
listen_addresses = 'localhost'  # 로컬만 허용

# /etc/postgresql/16/main/pg_hba.conf
local   all   cowrite   md5
host    all   cowrite   127.0.0.1/32   md5
```

---

## 4. Docker Compose

### docker-compose.yml

```yaml
version: '3.8'

services:
  # 프론트엔드
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: cowrite-frontend
    ports:
      - "3100:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8100
      - NEXT_PUBLIC_WS_URL=ws://localhost:8102
    depends_on:
      - core-api
    restart: unless-stopped
    networks:
      - cowrite-network

  # 코어 API (NestJS)
  core-api:
    build:
      context: ./backend/core
      dockerfile: Dockerfile
    container_name: cowrite-core
    ports:
      - "8100:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://cowrite:password@host.docker.internal:5432/cowrite
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=15m
      - REFRESH_TOKEN_EXPIRES_IN=7d
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - cowrite-network

  # AI 서비스 (FastAPI)
  ai-service:
    build:
      context: ./backend/ai
      dockerfile: Dockerfile
    container_name: cowrite-ai
    ports:
      - "8101:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - cowrite-network

  # 실시간 동기화 서비스
  sync-service:
    build:
      context: ./backend/sync
      dockerfile: Dockerfile
    container_name: cowrite-sync
    ports:
      - "8102:3000"
    environment:
      - DATABASE_URL=postgresql://cowrite:password@host.docker.internal:5432/cowrite
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - cowrite-network

  # Redis (캐시/세션)
  redis:
    image: redis:7-alpine
    container_name: cowrite-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
    networks:
      - cowrite-network

  # Nginx (리버스 프록시)
  nginx:
    image: nginx:alpine
    container_name: cowrite-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - core-api
      - ai-service
      - sync-service
    restart: unless-stopped
    networks:
      - cowrite-network

volumes:
  redis_data:

networks:
  cowrite-network:
    driver: bridge
```

---

## 5. Nginx 설정

### nginx/nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    upstream frontend {
        server frontend:3000;
    }
    
    upstream api {
        server core-api:3000;
    }
    
    upstream ai {
        server ai-service:8000;
    }
    
    upstream websocket {
        server sync-service:3000;
    }

    server {
        listen 80;
        server_name localhost;

        # 프론트엔드
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Core API
        location /api/ {
            rewrite ^/api/(.*) /$1 break;
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # AI API
        location /ai/ {
            rewrite ^/ai/(.*) /$1 break;
            proxy_pass http://ai;
            proxy_set_header Host $host;
            proxy_read_timeout 120s;  # AI 응답 대기
        }

        # WebSocket
        location /ws/ {
            rewrite ^/ws/(.*) /$1 break;
            proxy_pass http://websocket;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }

        # Health check
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
```

---

## 6. 환경 변수

### .env 파일

```bash
# Database (직접 설치된 PostgreSQL)
DATABASE_URL=postgresql://cowrite:your_secure_password@localhost:5432/cowrite

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# AI APIs
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# App
NODE_ENV=production
FRONTEND_URL=http://localhost:3100

# Optional
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
KAKAO_CLIENT_ID=xxx
KAKAO_CLIENT_SECRET=xxx
```

---

## 7. Dockerfile 예시

### Frontend (Next.js)

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### Core API (NestJS)

```dockerfile
# backend/core/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### AI Service (FastAPI)

```dockerfile
# backend/ai/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 8. 실행 명령어

```bash
# 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 빌드 및 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 개별 서비스 로그
docker-compose logs -f core-api

# 개별 서비스 재시작
docker-compose restart core-api

# 전체 중지
docker-compose down

# 볼륨 포함 삭제 (주의!)
docker-compose down -v
```

---

## 9. 서비스 접속 정보

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:3100 |
| 프론트엔드 (Nginx) | http://localhost |
| API 문서 (Swagger) | http://localhost:8100/api-docs |
| AI API 문서 | http://localhost:8101/docs |
| Redis | localhost:6379 |
| PostgreSQL | localhost:5432 |

---

## 10. 모니터링

### 헬스 체크

```bash
# 각 서비스 상태 확인
curl http://localhost/health
curl http://localhost:8100/health
curl http://localhost:8101/health
```

### 로그 관리

```bash
# 로그 파일 위치 (컨테이너 내부)
/var/log/nginx/access.log
/var/log/nginx/error.log

# 로그 볼륨 마운트 (선택)
volumes:
  - ./logs/nginx:/var/log/nginx
```

---

*버전: 2.0 | 작성일: 2026년 1월*
