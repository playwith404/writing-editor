# AI 1~4 One-Day Execution Plan

## 목표
오늘(2026-02-21) 안에 AI 1~4 기능을 "실행 가능한 상태"로 끝낸다.

대상 기능:
1. 설정 검색
2. 이어쓰기
3. 문체 변환
4. 캐릭터 시뮬레이션

## 작업 범위
포함:
- `backend/ai`
- `deploy`
- `.env.example`
- `docs`

제외:
- `frontend/src`
- `backend/core`
- `backend/sync`

원칙:
- Contract-first + Mock-first
- API 키 없이도 mock 모드로 즉시 검증 가능
- API 키 주입 시 live 모드로 즉시 전환 가능

## Today Runbook (Day1~Day5 압축 실행)

### Phase 1 (Day1): 계약서 + 에러 규격
시간: 1.5h

작업:
- `docs/ai_v0_contract_1_4.md` 작성
- `docs/ai_error_spec_v0.md` 작성
- 요청/응답/에러/모드 규칙 고정

완료 기준:
- 팀원 누구나 문서만 보고 mock/live 요청 생성 가능

### Phase 2 (Day2): mock 모드 구현
시간: 1.5h

작업:
- `AI_MODE=mock|live` 런타임 제어
- 1~4 기능 deterministic mock 응답
- provider 강제 옵션(`AI_FORCE_PROVIDER`) 추가

완료 기준:
- API 키 없이 1~4 엔드포인트 모두 200 응답

### Phase 3 (Day3): 설정 검색/이어쓰기 live
시간: 2h

작업:
- Gemini live 호출 연결
- 키 누락 시 명확한 오류 반환
- 타임아웃/모델 환경변수 반영

완료 기준:
- `AI_MODE=live` + `GEMINI_API_KEY`로 `/ai/search`, `/ai/complete` 정상

### Phase 4 (Day4): 문체 변환/캐릭터 시뮬 live
시간: 2h

작업:
- live 모드에서 `/ai/style/convert`, `/ai/character/simulate` 검증
- 요청 추적 로그(`request_id`, provider, model, latency) 추가

완료 기준:
- 1~4 전체가 동일 런타임 규칙(mock/live)로 동작

### Phase 5 (Day5): 테스트/로그/배포 문서 정리
시간: 1h

작업:
- AI 테스트 케이스 추가
- `.env.example`, `deploy/.env.example`, `deploy/README.md` 정리
- 운영 전환 체크리스트 기록

완료 기준:
- 환경변수만 설정하면 즉시 실행 가능

## 실행 환경 변수 (핵심)

Mock:
```env
AI_MODE=mock
AI_FORCE_PROVIDER=gemini
GEMINI_MODEL=gemini-3-flash-preview
```

Live:
```env
AI_MODE=live
AI_FORCE_PROVIDER=gemini
GEMINI_API_KEY=your_real_key
GEMINI_MODEL=gemini-3-flash-preview
AI_HTTP_TIMEOUT_SECONDS=60
```

## 최종 DoD
1. 1~4 기능이 mock/live 모두 동작
2. 문서 계약서와 코드 응답 형식이 일치
3. API 키 환경변수 주입 후 재빌드 없이 live 요청 가능
4. 에러 응답에 최소 `code`, `message` 포함
