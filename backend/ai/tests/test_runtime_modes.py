from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_mock_mode_returns_mock_response(monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")

    response = client.post(
        "/ai/complete",
        json={"provider": "gemini", "prompt": "A hero enters the room."},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "mock"
    assert body["provider"] == "gemini"
    assert "MOCK" in body["content"]
    assert body["request_id"]


def test_provider_input_is_ignored_and_gemini_is_used(monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")

    response = client.post(
        "/ai/complete",
        json={"provider": "legacy-provider", "prompt": "provider override check"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "gemini"


def test_live_mode_requires_gemini_api_key(monkeypatch):
    monkeypatch.setenv("AI_MODE", "live")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    response = client.post(
        "/ai/complete",
        json={"provider": "legacy-provider", "prompt": "should fail without key"},
    )

    assert response.status_code == 502
    body = response.json()
    detail = body.get("detail", {})
    assert detail.get("code") == "AI_PROVIDER_ERROR"
    assert "GEMINI_API_KEY" in detail.get("message", "")
