# gleey: Entity Relationship Diagram (ERD)

이 문서는 **gleey** 서비스의 데이터베이스 구조를 설명합니다. 프로젝트, 캐릭터, 세계관, 플롯, 회차(에피소드) 및 AI 기술을 위한 벡터 데이터 구성을 다룹니다.

---

## 1. 전체 구조 (DBML)

```dbml
// ==============================
// 1. 시리즈 (최상위)
// ==============================
Table projects {
  id uuid [primary key, note: '나의 삶 시리즈']
  user_id uuid [not null]
  title varchar(200) [not null]
  created_at timestamp [not null]
  updated_at timestamp [not null, note: '마지막 수정일 (홈 화면 노출용)']
}

// ==============================
// 2. 기획 (Planning) - 캐릭터
// ==============================
Table characters {
  id uuid [primary key]
  project_id uuid [not null]
  name varchar(100) [not null]
  image_url varchar(500) [note: '캐릭터 프로필 이미지 URL']
  job varchar(100) [note: '직업']
  personality jsonb [note: '성격 태그 배열']
  description text [note: '상세 설명글']
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

// ==============================
// 3. 기획 (Planning) - 세계관
// ==============================
Table worldviews {
  id uuid [primary key, note: '카테고리 고유 ID']
  project_id uuid [not null]
  name varchar(100) [not null, note: '카드 이름 (예: 용어, 관계성 등)']
  description text [note: '카드 설명']
  type varchar(50) [not null, note: '분류 (TERM, RELATION, CUSTOM 등)']
  is_synced boolean [default: true, note: '카드 전체 동기화 여부']
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

Table worldview_terms {
  id uuid [primary key]
  worldview_id uuid [not null]
  term varchar(200) [not null, note: '용어 이름']
  meaning text [not null, note: '용어의 뜻']
}

Table worldview_relationships {
  id uuid [primary key]
  worldview_id uuid [not null]
  base_character_id uuid [not null]
  target_character_id uuid [not null]
  relation_type varchar(50) [note: '예: 라이벌, 조력자, 가족 등']
  color varchar(20) [note: '관계선 및 태그 공통 색상']
}

Table worldview_entries {
  id uuid [primary key]
  worldview_id uuid [not null]
  title varchar(200) [not null, note: '항목 제목']
  content jsonb [note: '상세 설정 내용']
}

// ==============================
// 4. 기획 (Planning) - 플롯 타임라인
// ==============================
Table plots {
  id uuid [primary key]
  project_id uuid [not null]
  plot_number int [not null, note: '플롯 넘버']
  title varchar(200) [not null]
  description text [note: '설명']
  is_synced boolean [default: true]
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

Table plot_characters {
  plot_id uuid [not null]
  character_id uuid [not null]
}

Table plot_episodes {
  plot_id uuid [not null]
  episode_id uuid [not null]
}

// ==============================
// 5. 집필 (Writing) - 회차
// ==============================
Table episodes {
  id uuid [primary key, note: '개별 회차 ID']
  project_id uuid [not null]
  title varchar(200) [not null, note: '예: 1장. 나의 삶']
  content jsonb [note: '에디터 본문']
  char_count_with_space int [default: 0]
  char_count_no_space int [default: 0]
  status varchar(20) [default: 'TODO', note: '집필 유무 (TODO, DOING, DONE)']
  order_index int [not null, note: '회차 순서']
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

// ==============================
// 6. AI Vector DB
// ==============================
Table episode_embeddings {
  id uuid [primary key]
  episode_id uuid [not null]
  block_id varchar(100) [not null, note: '에디터 본문의 특정 블록 ID']
  chunk_text text [not null]
  embedding vector
  created_at timestamp [not null]
}

// ==============================
// Relationships
// ==============================
Ref: characters.project_id > projects.id
Ref: worldviews.project_id > projects.id
Ref: worldview_terms.worldview_id > worldviews.id
Ref: worldview_relationships.worldview_id > worldviews.id
Ref: worldview_entries.worldview_id > worldviews.id
Ref: worldview_relationships.base_character_id > characters.id
Ref: worldview_relationships.target_character_id > characters.id
Ref: plots.project_id > projects.id
Ref: plot_characters.plot_id > plots.id
Ref: plot_characters.character_id > characters.id
Ref: plot_episodes.plot_id > plots.id
Ref: plot_episodes.episode_id > episodes.id
Ref: episodes.project_id > projects.id
Ref: episode_embeddings.episode_id > episodes.id
```