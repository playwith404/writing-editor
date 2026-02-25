from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_mock_autocomplete_contract(monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")

    response = client.post(
        "/api/episodes/epi-uuid-002/ai/autocomplete",
        json={"cursor_block_id": "blk-003"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "data" in body
    assert "generated_blocks" in body["data"]
    assert len(body["data"]["generated_blocks"]) >= 1
    assert "type" in body["data"]["generated_blocks"][0]
    assert "text" in body["data"]["generated_blocks"][0]


def test_mock_ask_contract(monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")

    response = client.post(
        "/api/projects/proj-uuid-001/ai/ask",
        json={
            "question": "주인공이 전에 썼던 화염 마법 이름이 뭐였지?",
            "current_episode_id": "epi-uuid-002",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "answer" in body["data"]
    assert "references" in body["data"]
    assert isinstance(body["data"]["references"], list)


def test_mock_synonyms_contract(monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")

    response = client.post(
        "/api/episodes/epi-uuid-002/ai/synonyms",
        json={"selected_word": "고요하다", "block_id": "blk-010"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "recommendations" in body["data"]
    assert len(body["data"]["recommendations"]) >= 1


def test_mock_transform_style_accepts_target_block_id(monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")

    response = client.post(
        "/api/episodes/epi-uuid-002/ai/transform-style",
        json={"target_block_id": "blk-011", "style_tag": "동양풍"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "transformed_blocks" in body["data"]
    assert len(body["data"]["transformed_blocks"]) >= 1


def test_transform_style_rejects_conflicting_block_fields(monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")

    response = client.post(
        "/api/episodes/epi-uuid-002/ai/transform-style",
        json={
            "block_id": "blk-010",
            "target_block_id": "blk-011",
            "style_tag": "동양풍",
        },
    )

    assert response.status_code == 400
    body = response.json()
    detail = body.get("detail", {})
    assert detail.get("code") == "AI_VALIDATION_ERROR"


def test_transform_style_requires_block_identifier(monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")

    response = client.post(
        "/api/episodes/epi-uuid-002/ai/transform-style",
        json={"style_tag": "동양풍"},
    )

    assert response.status_code == 400
    body = response.json()
    detail = body.get("detail", {})
    assert detail.get("code") == "AI_VALIDATION_ERROR"


def test_live_mode_requires_gemini_api_key(monkeypatch):
    monkeypatch.setenv("AI_MODE", "live")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    response = client.post(
        "/api/episodes/epi-uuid-002/ai/autocomplete",
        json={"cursor_block_id": "blk-003"},
    )

    assert response.status_code == 502
    body = response.json()
    detail = body.get("detail", {})
    assert detail.get("code") == "AI_PROVIDER_ERROR"
    assert "GEMINI_API_KEY" in detail.get("message", "")
