# AI v0 Contract (Features 1~4)

버전: `v0`
작성일: `2026-02-21`
적용 범위: 이어쓰기, 문체 변환

## 1) 계약 원칙
1. 프론트는 Core API만 호출한다.
2. Core는 AI Service로 프록시한다.
3. 요청/응답은 `content` 필드를 유지해 하위호환을 지킨다.
4. 런타임 모드는 환경변수로 제어한다(`AI_MODE=mock|live`).

## 2) 공통 요청 규격

### 공통 필드
- `provider`: `openai | anthropic | gemini` (선택)
- `model`: 모델명 문자열 (선택)

권장 운영값:
- `provider=gemini`
- `model=gemini-3-flash-preview`

### 인증
- Core API는 기존 JWT 인증 규칙을 따른다.
- AI Service 내부 API는 Core 내부 호출 용도로 사용한다.

## 3) 공통 응답 규격

### Success
```json
{
  "content": "string",
  "request_id": "uuid",
  "mode": "mock|live",
  "provider": "openai|anthropic|gemini",
  "model": "string"
}
```

### Error
```json
{
  "detail": {
    "code": "AI_PROVIDER_ERROR|AI_VALIDATION_ERROR|...",
    "message": "string",
    "request_id": "uuid",
    "feature": "string",
    "provider": "string"
  }
}
```

## 4) Endpoint Contracts

### 4.1 이어쓰기

Core API:
- `POST /ai/complete`

Request:
```json
{
  "prompt": "다음 장면을 긴장감 있게 이어서 써줘.",
  "provider": "gemini",
  "model": "gemini-3-flash-preview"
}
```

Response:
```json
{
  "content": "...",
  "request_id": "uuid",
  "mode": "live",
  "provider": "gemini",
  "model": "gemini-3-flash-preview"
}
```

### 4.2 문체 변환

Core API:
- `POST /ai/style/convert`

Request:
```json
{
  "text": "원문",
  "style": "로판풍",
  "provider": "gemini",
  "model": "gemini-3-flash-preview"
}
```

Response: 공통 Success 규격 동일

## 5) 런타임 모드 계약

### mock
- 실제 외부 LLM 호출 없음
- deterministic mock 문구 반환
- API 키 없어도 동작

### live
- 실제 provider API 호출
- provider 키 누락 시 `AI_PROVIDER_ERROR` 반환

## 6) 환경변수 계약

필수/중요:
- `AI_MODE=mock|live`
- `AI_FORCE_PROVIDER=` (예: `gemini`)
- `AI_HTTP_TIMEOUT_SECONDS=60`
- `GEMINI_API_KEY=...`
- `GEMINI_MODEL=gemini-3-flash-preview`

## 7) 구현 상태 (2026-02-21)

- 1~2 endpoint 경로는 이미 연결되어 있음
- 본 계약은 현재 코드 응답 형태(`content` 유지)에 맞춰 작성됨
- 추후 v1에서 구조화 응답(JSON schema strict mode)로 확장 예정
