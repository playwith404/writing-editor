<p align="center">
  <h1 align="center">✍️ Gleey</h1>
  <p align="center">
    <strong>AI-Powered All-in-One Web Novel Writing Platform</strong><br>
    <em>"Write together with AI — 아이디어에서 출판까지"</em>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/Spring%20Boot-3.2-6DB33F?logo=spring-boot" alt="Spring Boot">
  <img src="https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis" alt="Redis">
</p>

---

## 📖 Overview

**Gleey**는 웹소설 작가를 위한 **종합 AI 창작 플랫폼**입니다.  
기획부터 집필, 퇴고, 출판까지 모든 창작 과정을 하나의 플랫폼에서 지원하며, AI를 '대체자'가 아닌 '협력자'로 활용합니다.

### ✨ 핵심 가치

| 가치 | 설명 |
|:---:|:---|
| **통합성** | 기획, 설정, 집필, 관리를 하나로 통합 |
| **지능성** | AI가 검색, 제안, 보조 — 작가의 노동 경감 |
| **접근성** | 초보부터 전문가까지 — 진입장벽 제거 |
| **유연성** | PC, 모바일, 오프라인 — 언제 어디서나 |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         클라이언트 레이어                         │
├─────────────────────────────────────────────────────────────────┤
│   Web App (Next.js)  │  Desktop (Electron)  │  Mobile (RN)     │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTPS/WSS
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Nginx (리버스 프록시)                        │
│              Rate Limiting, SSL Termination                      │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   Core API       │   │   AI Service     │   │   Sync Service   │
│   :8100          │   │   :8101          │   │   :8102          │
│   (Spring Boot)  │   │   (FastAPI)      │   │   (WebSocket)    │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       데이터 레이어                              │
├────────────────────────────┬────────────────────────────────────┤
│   PostgreSQL :5432         │   Redis :6379                      │
└────────────────────────────┴────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|:---|:---|
| **Frontend** | Next.js 16, React 19, TypeScript, TailwindCSS 4, Radix UI, TipTap Editor, Zustand |
| **Backend - Core** | Java 17, Spring Boot 3.2, Spring Security, Spring Data JPA, JWT |
| **Backend - AI** | Python, FastAPI, OpenAI API, Anthropic Claude |
| **Backend - Sync** | Spring WebSocket |
| **Database** | PostgreSQL 16, Redis 7 |
| **Search** | Elasticsearch 8.12 |
| **Infrastructure** | Docker, Docker Compose, Nginx |

---

## 📦 Services

| Service | Port | Description |
|:---|:---:|:---|
| `frontend` | **3100** | Next.js 웹 클라이언트 |
| `core-api` | **8100** | 핵심 비즈니스 로직 (Spring Boot) |
| `ai-service` | **8101** | LLM 연동 및 AI 기능 (FastAPI) |
| `sync-service` | **8102** | 실시간 협업, WebSocket |
| `postgresql` | 5432 | 메인 데이터베이스 |
| `redis` | 6379 | 캐시, 세션, 큐 |

---

## 🚀 Features

### 📋 기획실 (Planning Studio)
- **캐릭터 카드** — 프로필, 외모, 성격, 배경, 관계 관리
- **세계관 설정집** — 지리, 역사, 사회, 마법체계, 용어집
- **관계도 에디터** — 드래그앤드롭으로 캐릭터 관계 시각화
- **플롯 타임라인** — 3막 구조, 스노우플레이크 기법 지원

### ✍️ 집필실 (Writing Studio)
- **집중모드 에디터** — 디스트랙션 프리, 타자기 모드
- **씬/챕터 관리** — 시리즈 > 부 > 장 > 씬 계층 구조
- **목표 추적기** — 일일/주간/프로젝트 목표, 히트맵 시각화
- **자동 저장** — 로컬 + 클라우드 동기화

### 🤖 AI Assistant
- **이어쓰기 제안** — 문장/문단/대사 생성
- **문체 변환** — 톤, 시점, 장르 스타일 변환

### 🎮 스탯 매니저
- **상태창 템플릿** — RPG, 로판 등 장르별 스탯 시스템
- **자동 계산** — 경험치, 레벨업, 능력치 연산
- **일관성 체크** — 에피소드별 스탯 추적 및 오류 알림

### 🔄 싱크 & 백업
- **클라우드 동기화** — 실시간 동기화, 충돌 해결
- **오프라인 모드** — 로컬 저장, 재연결 시 동기화
- **버전 히스토리** — 자동 스냅샷, 롤백 지원

### 📤 퍼블리싱
- **통계 대시보드** — 집필 글자수, 시간, 속도 통계


---

## 📁 Project Structure

```
gleey/
├── backend/
│   ├── core/           # Spring Boot Core API
│   ├── ai/             # FastAPI AI Service
│   └── sync/           # Spring WebSocket Service
├── frontend/           # Next.js Frontend
├── database/           # SQL Schema & Migrations
├── deploy/             # Docker Compose & Nginx Config
├── docs/               # Design Documents
└── uploads/            # User Uploads
```

---

## 🚀 Quick Start

### Prerequisites
- Java 17+
- Node.js 20+
- Python 3.11+
- PostgreSQL 16
- Redis 7
- Docker & Docker Compose

### Local Development

```bash
# Backend Core API
cd backend/core
./gradlew bootRun

# Frontend
cd frontend
npm install
npm run dev

# AI Service
cd backend/ai
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8101
```

### Docker Deployment

```bash
docker compose -p gleey -f deploy/docker-compose.dev.yml up -d --build
```

---

## 🔐 Environment Variables

`.env.example` 파일을 참고하여 `.env` 파일을 생성하세요.

```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=gleey
POSTGRES_USER=gleey
POSTGRES_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret

# AI APIs
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

---

## 🔄 CI/CD

GitHub Actions 워크플로우:
- `.github/workflows/deploy-frontend-dev.yml` — Frontend 자동 배포
- `.github/workflows/deploy-backend-dev.yml` — Backend 자동 배포
- `.github/workflows/deploy-dev.yml` — 전체 배포 (수동)

### Required Secrets
- `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_PORT`
- `SSH_KNOWN_HOSTS` (optional)

---

## 📚 Documentation

자세한 설계 문서는 [`docs/`](./docs) 폴더를 참조하세요:

| Document | Description |
|:---|:---|
| [product_proposal.md](./docs/product_proposal.md) | 제품 기획서 |
| [architecture.md](./docs/architecture.md) | 시스템 아키텍처 |
| [feature_specification.md](./docs/feature_specification.md) | 기능 상세 명세 |
| [database_design.md](./docs/database_design.md) | 데이터베이스 설계 |
| [backend_design.md](./docs/backend_design.md) | 백엔드 설계 |
| [frontend_design.md](./docs/frontend_design.md) | 프론트엔드 설계 |
| [infrastructure_design.md](./docs/infrastructure_design.md) | 인프라 설계 |

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<p align="center">
  <strong>Made with for Web Novel Writers</strong>
</p>
