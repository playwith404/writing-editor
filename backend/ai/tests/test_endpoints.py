import httpx
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_internal_autocomplete_contract(monkeypatch):
    async def fake_call_provider_json(**kwargs):
        return {
            "generated_blocks": [
                {"type": "paragraph", "text": "next sentence 1"},
                {"type": "paragraph", "text": "next sentence 2"},
            ]
        }

    monkeypatch.setattr("app.services.ai_runner.call_provider_json", fake_call_provider_json)

    response = client.post(
        "/internal/episodes/epi-uuid-002/ai/autocomplete",
        json={
            "context": {
                "before_blocks": [
                    {"block_id": "blk-001", "text": "first sentence."},
                    {"block_id": "blk-002", "text": "second sentence."},
                ],
                "cursor_block": {"block_id": "blk-003", "text": "cursor sentence."},
                "after_blocks": [],
            },
            "generate_count": 2,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "generated_blocks" in body["data"]
    assert len(body["data"]["generated_blocks"]) == 2


def test_internal_ask_returns_not_found_when_context_empty():
    response = client.post(
        "/internal/projects/proj-uuid-001/ai/ask",
        json={"question": "what is the spell name?", "retrieved_contexts": []},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["references"] == []


def test_internal_ask_contract(monkeypatch):
    async def fake_call_provider_json(**kwargs):
        return {
            "answer": "The spell name is Hellfire.",
            "references": [
                {
                    "episode_id": "epi-uuid-001",
                    "title": "Chapter 1",
                    "matched_text": "...Hellfire...",
                }
            ],
        }

    monkeypatch.setattr("app.services.ai_runner.call_provider_json", fake_call_provider_json)

    response = client.post(
        "/internal/projects/proj-uuid-001/ai/ask",
        json={
            "question": "what is the spell name?",
            "retrieved_contexts": [
                {
                    "episode_id": "epi-uuid-001",
                    "episode_title": "Chapter 1",
                    "block_id": "blk-042",
                    "text": "The character used Hellfire.",
                }
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["references"][0]["title"] == "Chapter 1"


def test_internal_synonyms_contract(monkeypatch):
    async def fake_call_provider_json(**kwargs):
        return {
            "recommendations": [
                {"word": "silent", "description": "quiet and still"},
                {"word": "desolate", "description": "empty and bleak"},
            ]
        }

    monkeypatch.setattr("app.services.ai_runner.call_provider_json", fake_call_provider_json)

    response = client.post(
        "/internal/episodes/epi-uuid-002/ai/synonyms",
        json={
            "selected_word": "bleak",
            "context": {
                "target_block": {
                    "block_id": "blk-010",
                    "text": "At dawn, the town felt bleak.",
                },
                "surrounding_blocks": [{"block_id": "blk-011", "text": "No one was outside."}],
            },
            "recommend_count": 2,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]["recommendations"]) == 2


def test_transform_style_accepts_unlisted_style_tag(monkeypatch):
    async def fake_call_provider_json(**kwargs):
        return {
            "transformed_blocks": [
                {
                    "type": "paragraph",
                    "text": "rewritten paragraph",
                }
            ]
        }

    monkeypatch.setattr("app.services.ai_runner.call_provider_json", fake_call_provider_json)

    response = client.post(
        "/internal/episodes/epi-uuid-002/ai/transform-style",
        json={
            "target_block": {"block_id": "blk-011", "text": "Rain grew heavier."},
            "style_tag": "custom-style",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "transformed_blocks" in body["data"]


def test_short_text_is_allowed_in_autocomplete(monkeypatch):
    async def fake_call_provider_json(**kwargs):
        return {
            "generated_blocks": [
                {"type": "paragraph", "text": "ok"}
            ]
        }

    monkeypatch.setattr("app.services.ai_runner.call_provider_json", fake_call_provider_json)

    response = client.post(
        "/internal/episodes/epi-uuid-002/ai/autocomplete",
        json={
            "context": {
                "before_blocks": [],
                "cursor_block": {"block_id": "blk-003", "text": "hi"},
                "after_blocks": [],
            },
            "generate_count": 1,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "generated_blocks" in body["data"]


def test_internal_transform_style_contract(monkeypatch):
    async def fake_call_provider_json(**kwargs):
        return {
            "transformed_blocks": [
                {
                    "type": "paragraph",
                    "text": "converted sentence",
                }
            ]
        }

    monkeypatch.setattr("app.services.ai_runner.call_provider_json", fake_call_provider_json)

    response = client.post(
        "/internal/episodes/epi-uuid-002/ai/transform-style",
        json={
            "target_block": {"block_id": "blk-011", "text": "Rain grew heavier."},
            "style_tag": "eastern-style",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "transformed_blocks" in body["data"]


def test_provider_missing_key_returns_502(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    response = client.post(
        "/internal/episodes/epi-uuid-002/ai/autocomplete",
        json={
            "context": {
                "before_blocks": [],
                "cursor_block": {"block_id": "blk-003", "text": "cursor sentence"},
                "after_blocks": [],
            },
            "generate_count": 1,
        },
    )

    assert response.status_code == 502
    body = response.json()
    error = body.get("error", {})
    assert body["success"] is False
    assert error.get("code") == "GEMINI_ERROR"
    assert "GEMINI_API_KEY" in error.get("message", "")


def test_timeout_returns_504(monkeypatch):
    async def fake_call_provider_json(**kwargs):
        raise httpx.ReadTimeout("timeout")

    monkeypatch.setattr("app.services.ai_runner.call_provider_json", fake_call_provider_json)

    response = client.post(
        "/internal/episodes/epi-uuid-002/ai/autocomplete",
        json={
            "context": {
                "before_blocks": [],
                "cursor_block": {"block_id": "blk-003", "text": "cursor sentence"},
                "after_blocks": [],
            },
            "generate_count": 1,
        },
    )

    assert response.status_code == 504
    body = response.json()
    error = body.get("error", {})
    assert body["success"] is False
    assert error.get("code") == "GEMINI_TIMEOUT"


def test_validation_error_returns_400_invalid_request():
    response = client.post(
        "/internal/episodes/epi-uuid-002/ai/autocomplete",
        json={
            "context": {
                "before_blocks": [],
                "cursor_block": {"block_id": "blk-003", "text": "cursor sentence"},
                "after_blocks": [],
            },
            "generate_count": "abc",
        },
    )

    assert response.status_code == 400
    body = response.json()
    error = body.get("error", {})
    assert body["success"] is False
    assert error.get("code") == "INVALID_REQUEST"
    assert isinstance(error.get("request_id"), str)
