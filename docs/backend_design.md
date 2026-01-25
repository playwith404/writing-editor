# ⚙️ Cowrite 백엔드 설계

> 마이크로서비스 기반 백엔드 시스템의 상세 설계를 정의합니다.

---

## 1. 기술 스택

| 영역 | 기술 | 용도 |
|------|------|------|
| **Runtime** | Node.js 20 LTS | 메인 서비스 |
| **Framework** | NestJS 10.x | Core/Sync |
| **Python** | FastAPI | AI 서비스 |
| **ORM** | **TypeORM** | DB 접근 |
| **Validation** | class-validator | 입력 검증 |
| **Queue** | BullMQ + Redis | 비동기 작업 |
| **Cache** | Redis | 세션/캐시 |

---

## 2. 서비스별 설계

### 2.1 Core API (NestJS) - :8100

```
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   ├── google.strategy.ts
│   │   └── kakao.strategy.ts
│   ├── guards/
│   │   ├── jwt.guard.ts
│   │   └── roles.guard.ts
│   └── dto/
├── projects/
├── documents/
├── characters/
├── worldbuilding/
├── relationships/
├── stats/
└── versions/
```

**엔드포인트:**

| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/register` | 회원가입 |
| POST | `/auth/login` | 로그인 |
| POST | `/auth/refresh` | 토큰 갱신 |
| GET | `/auth/google` | Google OAuth |
| GET | `/auth/kakao` | Kakao OAuth |
| GET | `/projects` | 프로젝트 목록 |
| POST | `/projects` | 프로젝트 생성 |
| GET | `/projects/:id` | 프로젝트 상세 |
| PUT | `/projects/:id` | 프로젝트 수정 |
| DELETE | `/projects/:id` | 프로젝트 삭제 |
| GET | `/projects/:id/documents` | 원고 목록 |
| POST | `/projects/:id/documents` | 원고 생성 |
| PUT | `/documents/:id` | 원고 수정 |
| GET | `/projects/:id/characters` | 캐릭터 목록 |
| POST | `/projects/:id/characters` | 캐릭터 생성 |
| GET | `/projects/:id/world` | 세계관 설정 |
| GET | `/projects/:id/relationships` | 관계도 |

---

### 2.2 AI Service (FastAPI) - :8101

```python
app/
├── main.py
├── routers/
│   ├── completion.py      # 이어쓰기
│   ├── search.py          # 설정 검색
│   ├── style.py           # 문체 변환
│   ├── character.py       # 캐릭터 시뮬
│   ├── prediction.py      # 독자반응 예측
│   └── translation.py     # 번역
├── services/
│   ├── openai_service.py
│   ├── claude_service.py
│   └── whisper_service.py
├── prompts/               # 프롬프트 템플릿
└── models/                # Pydantic 모델
```

**엔드포인트:**

| Method | Path | 설명 |
|--------|------|------|
| POST | `/ai/complete` | 이어쓰기 |
| POST | `/ai/search` | 자연어 설정 검색 |
| POST | `/ai/style/convert` | 문체 변환 |
| POST | `/ai/character/simulate` | 캐릭터 시뮬레이션 |
| POST | `/ai/predict` | 독자반응 예측 |
| POST | `/ai/translate` | 번역 |
| POST | `/ai/transcribe` | 음성→텍스트 |

---

### 2.3 Sync Service - :8102

```typescript
// WebSocket 이벤트
interface SyncEvents {
  // 클라이언트 → 서버
  'cursor:move': { position: Position };
  'content:op': { operation: Operation };
  'presence:update': { status: 'active' | 'idle' };
  
  // 서버 → 클라이언트
  'cursor:update': { userId: string; position: Position };
  'content:sync': { operations: Operation[] };
  'presence:change': { users: User[] };
}
```

---

## 3. API 설계 원칙

### 3.1 RESTful 컨벤션

```
GET    /resources          # 목록 조회
GET    /resources/:id      # 단건 조회
POST   /resources          # 생성
PUT    /resources/:id      # 전체 수정
PATCH  /resources/:id      # 부분 수정
DELETE /resources/:id      # 삭제
```

### 3.2 응답 형식

```json
// 성공
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}

// 에러
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}
```

---

## 4. 인증/인가

### 4.1 JWT 구조

```typescript
// Access Token (15분)
{
  sub: "user_id",
  email: "user@example.com",
  roles: ["user", "pro"],
  iat: 1234567890,
  exp: 1234568790
}

// Refresh Token (7일)
{
  sub: "user_id",
  type: "refresh",
  iat: 1234567890,
  exp: 1235172690
}
```

### 4.2 RBAC

| Role | 권한 |
|------|------|
| `guest` | 읽기 전용 |
| `user` | 기본 기능 |
| `pro` | Pro 기능 + AI |
| `master` | 무제한 AI + 팀 |
| `admin` | 관리자 |

---

## 5. 비동기 처리

### 5.1 작업 큐 (BullMQ)

```typescript
// 큐 정의
const queues = {
  'ai-tasks': AIQueue,        // AI 요청
  'export': ExportQueue,      // 내보내기
  'email': EmailQueue,        // 이메일
};

// 프로세서
@Processor('ai-tasks')
export class AIProcessor {
  @Process('completion')
  async handleCompletion(job: Job) {
    const result = await aiService.complete(job.data);
    return result;
  }
}
```

---

## 6. 에러 처리

### 6.1 에러 코드

| 코드 | HTTP | 설명 |
|------|------|------|
| `AUTH_INVALID_TOKEN` | 401 | 유효하지 않은 토큰 |
| `AUTH_EXPIRED_TOKEN` | 401 | 만료된 토큰 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `VALIDATION_ERROR` | 400 | 입력 검증 실패 |
| `QUOTA_EXCEEDED` | 429 | AI 쿼터 초과 |
| `INTERNAL_ERROR` | 500 | 서버 오류 |

---

## 7. 캐싱 전략

| 데이터 | TTL | 무효화 |
|--------|-----|--------|
| 사용자 정보 | 5분 | 수정 시 |
| 프로젝트 목록 | 1분 | CRUD 시 |
| 설정 데이터 | 10분 | 수정 시 |
| AI 응답 | 1시간 | 동일 요청 |

---

## 8. 모니터링

### 로깅

```typescript
// 구조화된 로그
{
  timestamp: "2026-01-23T15:00:00Z",
  level: "info",
  service: "core-api",
  traceId: "abc123",
  userId: "user123",
  action: "document.save",
  duration: 45
}
```

---

*버전: 1.0 | 작성일: 2026년 1월*
