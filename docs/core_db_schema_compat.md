# Core DB Schema Guide

## 목적
- `backend/core/app/models/*` 기준으로 DB 스키마를 1:1로 맞춘 단일 DDL을 제공합니다.
- 단일 소스 오브 트루스는 `database/schema.sql`입니다.

## 스키마 파일
- 단일 DDL: `database/schema.sql`
- 기준 코드: `backend/core/app/models/project.py`, `character.py`, `worldview.py`, `plot.py`, `episode.py`

## 핵심 정합 규칙
1. 테이블/컬럼명은 ORM 모델과 동일하게 유지
2. FK와 `ON DELETE CASCADE`는 모델 정의 기준으로 반영
3. `episodes.char_count` 컬럼명 유지 (`char_count_with_space` 사용 안 함)
4. `worldview_terms`, `worldview_relationships`, `worldview_entries`의 `created_at` 포함
5. `plot_episodes.episode_id`는 FK로 직접 연결
6. `episode_embeddings.embedding`은 `VECTOR(1536)` 사용

## 정합 포인트
- `projects.user_id` 사용
- `episodes.char_count` 사용 (`char_count_with_space` 미사용)
- `worldview_terms`, `worldview_relationships`, `worldview_entries`는 `created_at` 포함
- `plot_episodes.episode_id`는 FK 직접 연결
- `episode_embeddings.embedding`은 `VECTOR(1536)` + HNSW 인덱스

## 적용 방법
1. Core 전용 로컬 DB를 새로 만들거나, 별도 스키마/DB에 적용
2. `database/schema.sql` 실행
3. Core API 실행 후 `/docs`에서 CRUD 동작 확인

## 주의
- 기능 확장 시 `database/schema.sql`에만 추가합니다.
- 운영 환경에서는 Alembic 같은 마이그레이션 툴로 변경 이력 관리가 필요합니다.
