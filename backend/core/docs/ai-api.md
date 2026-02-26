# swagger API 명세서
# ai <-> backend API 명세서

# 내부 API 명세서: Core API ↔ AI Service

> **Overview**
이 문서는 Core API(백엔드)가 내부망을 통해 AI 서비스에 요청을 보낼 때 사용하는 API 명세서입니다.
Core API는 프론트엔드로부터 받은 `block_id`를 기반으로 데이터베이스를 조회하여, AI가 문맥을 파악하는 데 필요한 **실제 텍스트(`text`)와 주변 블록들 배열**을 구성하여 전달합니다. AI 서비스는 DB에 직접 접근하지 않습니다.
> 

### 구현 책임 분리 (중요)

- `backend/core` 담당:
  - 프론트 공개 API(`/api/...`) 제공
  - DB 조회 후 AI 내부 요청 payload 조립
  - AI 응답을 프론트 응답 형식으로 전달
- `backend/ai` 담당:
  - Core가 호출하는 내부 API(`/internal/...`) 실제 구현
  - 모델 호출/모드 제어/에러 코드 생성

### 경로 매핑 (FE ↔ Core ↔ AI)

| FE -> Core 공개 API | Core -> AI 내부 API |
| --- | --- |
| `POST /api/episodes/{episodeId}/ai/synonyms` | `POST /internal/episodes/{episodeId}/ai/synonyms` |
| `POST /api/episodes/{episodeId}/ai/autocomplete` | `POST /internal/episodes/{episodeId}/ai/autocomplete` |
| `POST /api/episodes/{episodeId}/ai/transform-style` | `POST /internal/episodes/{episodeId}/ai/transform-style` |
| `POST /api/projects/{projectId}/ai/ask` | `POST /internal/projects/{projectId}/ai/ask` |

---

### 공통 정보

- **Base URL:** `http://127.0.0.1:8000` (컨테이너 내부 통신)
- **공통 헤더:** `Content-Type: application/json`

---

### 공통 에러 응답

모든 에러는 아래 포맷으로 내려옵니다.

```json
{
  "success": false,
  "error": {
    "code": "에러 코드",
    "message": "에러 설명",
    "request_id": "uuid"
  }
}
```

| HTTP 상태코드 | 에러 코드 | 발생 상황 |
| --- | --- | --- |
| `400` | `INVALID_REQUEST` | 필수 필드 누락, 잘못된 타입 등 요청 데이터 오류 |
| `500` | `INTERNAL_ERROR` | AI 서비스 내부에서 예상치 못한 에러 발생 |
| `502` | `GEMINI_ERROR` | Gemini API 호출 실패, API 키 없음, 응답 파싱 실패 |
| `504` | `GEMINI_TIMEOUT` | Gemini API 응답 시간 초과 |

> 💡 502 에러에는 `feature`(기능명), `provider`(“gemini”) 필드가 추가로 포함됩니다.
> 

## 1. 단어 찾기 (대체어 추천)

> Core API가 타겟 단어가 포함된 문단과 앞뒤 문맥(Surrounding blocks) 1개씩을 찾아 AI 서비스에 전달합니다.
> 
- **Method:** `POST`
- **Endpoint:** `/internal/episodes/{episodeId}/ai/synonyms`

**Request Body (Core API ➡️ AI Service)**

```json
{
  "selected_word": "야르",
  "context": {
    "target_block": {
      "block_id": "blk-010",
      "text": "그 새벽, 마을은 야르했다. 불도 꺼지고, 사람도 없었다."
    },
    "surrounding_blocks": [
      {
        "block_id": "blk-009",
        "text": "전쟁이 끝난 지 사흘이 지났다."
      },
      {
        "block_id": "blk-011",
        "text": "길초는 홀로 마을 한가운데 서 있었다."
      }
    ]
  },
  "recommend_count": 3
}
```

**Response (AI Service ➡️ Core API)**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "word": "적막하다",
        "description": "\"아무런 소리도 없이 고요하고 쓸쓸하다.\""
      }
    ]
  }
}
```

---

## 2. 이어쓰기 (Autocomplete)

> Core API가 커서가 위치한 블록을 기준으로 앞 문맥(최대 5개)과 뒤 문맥(최대 2개)의 텍스트를 추출하여 전달합니다.
> 
- **Method:** `POST`
- **Endpoint:** `/internal/episodes/{episodeId}/ai/autocomplete`

**Request Body (Core API ➡️ AI Service)**

```json
{
  "context": {
    "before_blocks": [
      {
        "block_id": "blk-001",
        "text": "연우의 등 뒤로 거대한 그림자가 드리웠다."
      },
      {
        "block_id": "blk-002",
        "text": "\"누구냐!\" 연우가 지팡이를 고쳐 쥐며 외쳤다."
      }
    ],
    "cursor_block": {
      "block_id": "blk-003",
      "text": "그림자 속에서 붉은 눈동자가 번쩍였다."
    },
    "after_blocks": []
  },
  "generate_count": 2
}
```

**Response (AI Service ➡️ Core API)**

```json
{
  "success": true,
  "data": {
    "generated_blocks": [
      {
        "type": "paragraph",
        "text": "그 순간, 붉은 눈동자가 허공을 갈랐다."
      }
    ]
  }
}
```

---

## 3. 문체 변환 (Transform Style)

> Core API가 프론트에서 받은 `block_id`에 해당하는 실제 원문 텍스트를 DB에서 꺼내 전달합니다.
> 
- **Method:** `POST`
- **Endpoint:** `/internal/episodes/{episodeId}/ai/transform-style`

**Request Body (Core API ➡️ AI Service)**

```json
{
  "target_block": {
    "block_id": "blk-010",
    "text": "그건 아마도 내가 잊고 싶었던 과거의 조각이었을 것이다. 빗줄기는 점점 거세졌고..."
  },
  "style_tag": "동양풍"
}
```

**Response (AI Service ➡️ Core API)**

```json
{
  "success": true,
  "data": {
    "transformed_blocks": [
      {
        "type": "paragraph",
        "text": "\"그것은 필시 내 가슴 깊이 묻어두었던 지난날의 파편이었으리라. 빗줄기는 끊임없이 쏟아졌고...\""
      }
    ]
  }
}
```

---

## 4. 설정 Q&A (Ask)

> Core API가 작가의 질문을 바탕으로 Vector DB를 자체 검색한 뒤, 가장 유사도가 높은 본문 조각(Context)들을 추려서 AI에게 전달합니다.
> 
- **Method:** `POST`
- **Endpoint:** `/internal/projects/{projectId}/ai/ask`

**Request Body (Core API ➡️ AI Service)**

```json
{
  "question": "주인공이 전에 썼던 화염 마법 이름이 뭐였지?",
  "retrieved_contexts": [
    {
      "episode_id": "123e4567-e89b-12d3-a456-426614174001",
      "episode_title": "1장. 비 내리는 숲",
      "block_id": "blk-042",
      "text": "주인공은 입술을 깨물며 금지된 마법, '헬파이어'를 영창했다."
    },
    {
      "episode_id": "123e4567-e89b-12d3-a456-426614174003",
      "episode_title": "3장. 폭발하는 마력",
      "block_id": "blk-115",
      "text": "헬파이어를 다시 쓰다간 몸이 버티지 못한다."
    }
  ]
}
```

**Response (AI Service ➡️ Core API)**

```json
{
  "success": true,
  "data": {
    "answer": "1장 '비 내리는 숲'에서 주인공이 사용했던 화염 마법의 이름은 **'헬파이어(Hellfire)'**입니다.",
    "references": [
      {
        "episode_id": "123e4567-e89b-12d3-a456-426614174001",
        "title": "1장. 비 내리는 숲",
        "matched_text": "...주인공은 입술을 깨물며 금지된 마법, '헬파이어'를 영창했다..."
      }
    ]
  }
}
```
