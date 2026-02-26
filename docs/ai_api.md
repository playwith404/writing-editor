# 백엔드 ai api 명세

# 백엔드 ↔︎ AI 서비스 내부 API 명세서

> 이 문서는 **백엔드(Core API) ↔︎ AI 서비스** 사이의 내부 통신 명세입니다.
> 

---

## 전체 흐름 요약

```
[프론트엔드]
    ↓  최소 요청 (block_id, question 등)
[백엔드 Core]
    ↓  1. JWT 인증/권한 검증
    ↓  2. DB에서 필요한 문맥 텍스트 직접 조회
    ↓  3. 조회한 데이터를 AI 서비스에 전달
[AI 서비스]
    ↓  4. 전달받은 텍스트로 Gemini API 호출
    ↓  5. 결과 가공 후 백엔드에 반환
[백엔드 Core]
    ↓  6. AI 결과를 프론트엔드 응답 포맷으로 변환하여 반환
[프론트엔드]
```

### 핵심 역할 분리

| 주체 | 역할 |
| --- | --- |
| **백엔드(Core)** | 인증/권한 검증, DB 조회, AI 서비스 내부 호출, 프론트 응답 포맷 변환 |
| **AI 서비스** | 전달받은 텍스트로 Gemini API 호출, 결과 가공 후 반환 |

> ⚠️ **중요**: AI 서비스는 DB에 직접 접근하지 않습니다. 모든 DB 조회는 백엔드가 수행하고, 필요한 텍스트만 AI 서비스에 전달합니다.
> 

---

## 공통 규칙

### Base URL

```
http://127.0.0.1:8000
```

> 💡 AI 서비스는 별도 컨테이너가 아닙니다. `gleey-backend` 컨테이너 하나 안에서 Core API(3000), Sync Service(3001), AI Service(8000) 세 프로세스가 `start-backend.sh`에 의해 함께 실행됩니다.
Core API가 AI 서비스를 호출할 때는 같은 컨테이너 내부의 `localhost`로 통신하므로 `http://127.0.0.1:8000`이 됩니다.
> 

```
외부 인터넷 → API 게이트웨이 → /api/*       (허용 - 프론트가 호출)
                             → /internal/*  (차단 - 백엔드만 내부망으로 접근)
```

### 공통 요청 헤더

```
Content-Type: application/json
```

### 공통 에러 응답

```json
{
  "success": false,
  "error": {
    "code": "에러 코드 (문자열)",
    "message": "에러 설명 (개발자용)"
  }
}
```

| HTTP 상태코드 | 에러 코드 | 설명 |
| --- | --- | --- |
| `400` | `INVALID_REQUEST` | 필수 필드 누락 또는 잘못된 값 |
| `422` | `CONTEXT_TOO_SHORT` | 전달된 문맥 텍스트가 너무 짧아 처리 불가 |
| `502` | `GEMINI_ERROR` | Gemini API 호출 실패 |
| `504` | `GEMINI_TIMEOUT` | Gemini API 응답 시간 초과 |

---

## AI 도우미 4가지 기능 명세

---

### 1. 이어쓰기 (Autocomplete)

> 작가가 글을 쓰다 멈춘 지점(커서 블록)을 기준으로 앞뒤 문맥을 파악하여 자연스럽게 이어질 문장을 생성합니다.
> 

### `POST /internal/episodes/{episodeId}/ai/autocomplete`

> 💡 경로에 `episodeId`를 포함하는 이유: 서버 로그에서 어느 회차 요청인지 바로 추적할 수 있어 디버깅이 편합니다.
> 
- **Request:**

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

**필드 설명:**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `context.before_blocks` | array | ✅ | 커서 블록 앞의 문단들 (최대 5개, 백엔드가 DB에서 조회) |
| `context.cursor_block` | object | ✅ | 현재 커서가 위치한 블록 |
| `context.after_blocks` | array | ✅ | 커서 블록 뒤의 문단들 (있으면 전달, 없으면 빈 배열) |
| `generate_count` | integer | ✅ | 생성할 문단 수 (기본값: 2) |
- **Response:**

```json
{
  "success": true,
  "data": {
    "generated_blocks": [
      {
        "type": "paragraph",
        "text": "그 순간, 붉은 눈동자가 허공을 갈랐다."
      },
      {
        "type": "paragraph",
        "text": "하지만 연우의 검이 더 빨랐다. 지팡이를 내던진 연우는 허리춤의 단검을 뽑아 들고, 짐승처럼 도약해 그림자의 심장부를 향해 망설임 없이 검기를 꽂아 넣었다."
      }
    ]
  }
}
```

**필드 설명:**

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `generated_blocks` | array | 생성된 문단 블록 배열. 백엔드는 이것을 그대로 프론트에 전달 |
| `generated_blocks[].type` | string | 항상 `"paragraph"` |
| `generated_blocks[].text` | string | 생성된 문장 내용 |

---

### 2. 단어 찾기 / 대체어 추천 (Synonyms)

> 작가가 특정 단어를 드래그해서 선택하면, 해당 단어가 사용된 문맥을 파악하여 어울리는 대체 표현을 추천합니다.
> 

### `POST /internal/episodes/{episodeId}/ai/synonyms`

- **Request:**

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

**필드 설명:**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `selected_word` | string | ✅ | 작가가 선택한 단어 |
| `context.target_block` | object | ✅ | 해당 단어가 포함된 문단 (백엔드가 block_id로 DB 조회) |
| `context.surrounding_blocks` | array | ✅ | 앞뒤 1~2개 문단 (문맥 파악용) |
| `recommend_count` | integer | ✅ | 추천 단어 수 (기본값: 3) |
- **Response:**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "word": "적막하다",
        "description": "아무런 소리도 없이 고요하고 쓸쓸하다."
      },
      {
        "word": "황량하다",
        "description": "거칠고 쓸쓸하여 볼품없다."
      },
      {
        "word": "공허하다",
        "description": "속이 텅 비어 아무것도 없다."
      }
    ]
  }
}
```

**필드 설명:**

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `recommendations` | array | 추천 단어 목록 |
| `recommendations[].word` | string | 추천 단어 |
| `recommendations[].description` | string | 해당 단어의 뜻 설명 (국어사전 스타일) |

---

### 3. 문체 변환 (Transform Style)

> 작가가 선택한 문단을 지정한 스타일로 변환합니다. 내용은 유지하되 문체와 어조를 바꿉니다.
> 

### `POST /internal/episodes/{episodeId}/ai/transform-style`

- **Request:**

```json
{
  "target_block": {
    "block_id": "blk-010",
    "text": "그건 아마도 내가 잊고 싶었던 과거의 조각이었을 것이다. 빗줄기는 점점 거세졌고..."
  },
  "style_tag": "동양풍"
}
```

**필드 설명:**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `target_block` | object | ✅ | 변환할 원본 블록 (백엔드가 block_id로 DB 조회) |
| `target_block.block_id` | string | ✅ | 원본 블록 ID (백엔드가 어느 블록을 교체할지 식별용) |
| `target_block.text` | string | ✅ | 변환할 원문 텍스트 |
| `style_tag` | string | ✅ | 변환할 문체 태그 |

**`style_tag` 허용 값 목록:**

| 값 | 설명 |
| --- | --- |
| `"동양풍"` | 고전 무협/한문 느낌의 문체 |
| `"서양풍"` | 서구 판타지 소설 느낌의 문체 |
| `"현대적"` | 가볍고 읽기 쉬운 현대 문체 |
| `"감성적"` | 감정을 강조한 서정적 문체 |
| `"건조체"` | 감정 없이 사실만 서술하는 간결한 문체 |

> 💡 알 수 없는 `style_tag`가 오면 AI 서비스는 `400 INVALID_REQUEST`를 반환합니다.
> 
- **Response:**

```json
{
  "success": true,
  "data": {
    "transformed_blocks": [
      {
        "type": "paragraph",
        "text": "그것은 필시 내 가슴 깊이 묻어두었던 지난날의 파편이었으리라. 빗줄기는 끊임없이 세차게 쏟아졌고..."
      }
    ]
  }
}
```

**필드 설명:**

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `transformed_blocks` | array | 변환된 블록 배열. 백엔드는 이것을 그대로 프론트에 전달 |
| `transformed_blocks[].type` | string | 항상 `"paragraph"` |
| `transformed_blocks[].text` | string | 문체 변환된 텍스트 |

---

### 4. 설정 검색 (Ask)

> 작가가 자연어로 질문하면, 작성한 회차들을 검색하여 관련 내용을 찾아 답변합니다. (예: “주인공이 1장에서 쓴 마법 이름이 뭐였지?”)
> 

### `POST /internal/projects/{projectId}/ai/ask`

> 💡 이 기능만 `projectId`를 사용하는 이유: 특정 회차 하나가 아니라 프로젝트 전체 회차를 대상으로 검색하기 때문입니다.
> 
- **Request:**

```json
{
  "question": "주인공이 전에 썼던 화염 마법 이름이 뭐였지?",
  "retrieved_contexts": [
    {
      "episode_id": "epi-uuid-001",
      "episode_title": "1장. 비 내리는 숲",
      "block_id": "blk-042",
      "text": "주인공은 입술을 깨물며 금지된 마법, '헬파이어'를 영창했다. 붉은 화염이 손끝에서 피어올랐다."
    },
    {
      "episode_id": "epi-uuid-003",
      "episode_title": "3장. 폭발하는 마력",
      "block_id": "blk-115",
      "text": "헬파이어를 다시 쓰다간 몸이 버티지 못한다. 길초는 이를 악물었다."
    }
  ]
}
```

**필드 설명:**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `question` | string | ✅ | 작가가 입력한 질문 원문 |
| `retrieved_contexts` | array | ✅ | 백엔드가 Vector DB로 의미 검색해서 뽑아온 관련 블록들 |
| `retrieved_contexts[].episode_id` | string | ✅ | 출처 회차 ID |
| `retrieved_contexts[].episode_title` | string | ✅ | 출처 회차 제목 (AI가 답변에 인용할 수 있도록) |
| `retrieved_contexts[].block_id` | string | ✅ | 출처 블록 ID |
| `retrieved_contexts[].text` | string | ✅ | 관련 블록의 실제 텍스트 |

> 💡 **Vector DB 검색은 백엔드 담당**: 백엔드가 질문을 임베딩 벡터로 변환하여 `episode_embeddings` 테이블에서 유사도 검색을 수행한 뒤, 관련도 높은 블록들을 `retrieved_contexts`에 담아 AI 서비스에 전달합니다. AI 서비스는 이 과정에 관여하지 않습니다.
> 
- **Response:**

```json
{
  "success": true,
  "data": {
    "answer": "1장 '비 내리는 숲'에서 주인공이 사용했던 화염 마법의 이름은 **'헬파이어(Hellfire)'** 입니다. 당시 고블린 무리를 퇴치할 때 사용했으며, 3장에서도 언급됩니다.",
    "references": [
      {
        "episode_id": "epi-uuid-001",
        "title": "1장. 비 내리는 숲",
        "matched_text": "주인공은 입술을 깨물며 금지된 마법, '헬파이어'를 영창했다."
      },
      {
        "episode_id": "epi-uuid-003",
        "title": "3장. 폭발하는 마력",
        "matched_text": "헬파이어를 다시 쓰다간 몸이 버티지 못한다."
      }
    ]
  }
}
```

**필드 설명:**

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `answer` | string | 질문에 대한 AI의 자연어 답변 (마크다운 강조 포함 가능) |
| `references` | array | 답변의 근거가 된 블록 목록 (전달받은 `retrieved_contexts` 중 실제로 참고한 것만 골라서 반환) |
| `references[].episode_id` | string | 출처 회차 ID |
| `references[].title` | string | 출처 회차 제목 |
| `references[].matched_text` | string | 답변에 사용된 핵심 문장 발췌 |

> 💡 `references`가 비어있는 경우(전달된 문맥에서 관련 내용을 찾지 못한 경우)에도 `answer`는 반환됩니다. 단, 이 경우 답변 신뢰도가 낮을 수 있어 백엔드가 프론트에 별도 안내를 줄 수 있습니다.
> 

---

## 전체 API 목록 요약

| Method | 내부 엔드포인트 | 기능 |
| --- | --- | --- |
| `POST` | `/internal/episodes/{episodeId}/ai/autocomplete` | 이어쓰기 |
| `POST` | `/internal/episodes/{episodeId}/ai/synonyms` | 단어 찾기 / 대체어 추천 |
| `POST` | `/internal/episodes/{episodeId}/ai/transform-style` | 문체 변환 |
| `POST` | `/internal/projects/{projectId}/ai/ask` | 설정 검색 |

---

## 백엔드가 각 기능에서 DB 조회해야 할 것들

| 기능 | 백엔드 DB 조회 내용 |
| --- | --- |
| **이어쓰기** | `cursor_block_id` 기준으로 같은 episode의 앞 블록 최대 5개, 뒤 블록 최대 2개 조회 |
| **단어 찾기** | `block_id`로 해당 블록 텍스트 조회 + 앞뒤 블록 1~2개 조회 |
| **문체 변환** | `block_id`로 해당 블록 원문 텍스트 조회 |
| **설정 검색** | 질문을 임베딩 변환 → `episode_embeddings` 테이블에서 유사도 상위 3~5개 블록 조회 |

---

## 에러 처리 흐름

```
AI 서비스가 에러 반환
    ↓
백엔드가 에러 수신
    ↓
백엔드가 프론트에 적절한 에러 메시지로 변환하여 전달
    (AI 서비스 내부 에러 상세는 프론트에 노출하지 않음)
```

**백엔드가 프론트에 전달할 에러 메시지 예시:**

| AI 서비스 에러 | 프론트에 전달할 메시지 |
| --- | --- |
| `GEMINI_ERROR` | “AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.” |
| `GEMINI_TIMEOUT` | “AI 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.” |
| `CONTEXT_TOO_SHORT` | “문맥이 부족하여 AI가 처리할 수 없습니다. 글을 조금 더 작성한 뒤 시도해 주세요.” |