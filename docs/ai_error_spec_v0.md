# AI Error Spec v0

버전: `v0`
작성일: `2026-02-21`

## 표준 에러 형태

```json
{
  "detail": {
    "code": "AI_PROVIDER_ERROR",
    "message": "GEMINI_API_KEY is not set...",
    "request_id": "uuid",
    "feature": "complete",
    "provider": "gemini"
  }
}
```

## 코드 목록

1. `AI_VALIDATION_ERROR`
- HTTP: `400`
- 의미: 필수 입력 누락/형식 오류
- 예: transcribe 요청에 `text` 없음

2. `AI_PROVIDER_ERROR`
- HTTP: `502`
- 의미: 외부 AI provider 호출 실패
- 원인: API 키 누락, provider 응답 오류, 모델 오류, timeout 등

## 운영 규칙

1. `message`는 사람이 바로 조치 가능한 문구를 사용한다.
2. 가능하면 `request_id`를 포함해 로그 추적 가능하게 한다.
3. Core 프록시 단계에서 에러가 단순화될 수 있으므로, 상세 원인은 AI Service 로그를 우선 확인한다.

## 장애 대응 순서

1. `AI_MODE` 값 확인 (`mock`/`live`)
2. `AI_FORCE_PROVIDER` 값 확인
3. provider 키(`*_API_KEY`) 존재 여부 확인
4. 모델명(`*_MODEL`) 유효성 확인
5. 네트워크/timeout(`AI_HTTP_TIMEOUT_SECONDS`) 확인
