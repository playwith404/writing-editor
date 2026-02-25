import hashlib

def _sig(*parts: str) -> str:
    raw = "::".join(parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:8]


def build_mock_autocomplete_data(episode_id: str, cursor_block_id: str) -> dict:
    sig = _sig("autocomplete", episode_id, cursor_block_id)
    return {
        "generated_blocks": [
            {
                "type": "paragraph",
                "text": f"그 순간, 바람이 멎자 공기가 칼날처럼 가늘어졌다. ({sig})",
            },
            {
                "type": "paragraph",
                "text": "주인공은 숨을 죽인 채 어둠 속 발소리를 세었다. 세 번째 발걸음이 닿는 순간, 그는 망설임 없이 앞으로 뛰어들었다.",
            },
        ]
    }


def build_mock_ask_data(project_id: str, current_episode_id: str, question: str) -> dict:
    sig = _sig("ask", project_id, current_episode_id, question)
    return {
        "answer": (
            "현재 저장된 회차 기록 기준으로 보면, 질문한 설정은 초반부 전투 장면에서 "
            "한 번 명시된 것으로 정리됩니다."
        ),
        "references": [
            {
                "episode_id": current_episode_id,
                "title": "2장. 검은 그림자",
                "matched_text": (
                    f"...주인공은 금지된 술식을 다시 떠올렸다. "
                    f"그 명칭은 전투 직전 짧게 언급되었다... ({sig})"
                ),
            }
        ],
    }


def build_mock_synonyms_data(episode_id: str, block_id: str, selected_word: str) -> dict:
    _ = _sig("synonyms", episode_id, block_id, selected_word)
    return {
        "recommendations": [
            {
                "word": "적막하다",
                "description": "\"소리와 움직임이 거의 없어 고요하다.\"",
            },
            {
                "word": "정적이 흐르다",
                "description": "\"잠깐의 침묵이 길게 이어지는 느낌을 준다.\"",
            },
        ]
    }


def build_mock_transform_style_data(episode_id: str, block_id: str, style_tag: str) -> dict:
    sig = _sig("transform_style", episode_id, block_id, style_tag)
    return {
        "transformed_blocks": [
            {
                "type": "paragraph",
                "text": (
                    f"\"하늘빛이 검게 잠기니, 칼끝에 맺힌 숨결마저 차디차구나.\" "
                    f"그는 빗발을 가르며 천천히 검을 세웠다. ({style_tag}/{sig})"
                ),
            }
        ]
    }
