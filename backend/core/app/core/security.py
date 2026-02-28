import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("ascii"))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return f"pbkdf2_sha256$200000${_b64url_encode(salt)}${_b64url_encode(digest)}"


def verify_password(password: str, stored_hash: str | None) -> bool:
    if not stored_hash:
        return False
    try:
        algorithm, rounds_str, salt_b64, hash_b64 = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        rounds = int(rounds_str)
        salt = _b64url_decode(salt_b64)
        expected = _b64url_decode(hash_b64)
    except (ValueError, TypeError):
        return False

    computed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, rounds)
    return hmac.compare_digest(computed, expected)


def create_jwt_token(payload: dict[str, Any], secret: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    full_payload = {
        **payload,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(full_payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_b64}.{payload_b64}.{_b64url_encode(signature)}"


def decode_jwt_token(token: str, secret: str) -> dict[str, Any]:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError as exc:
        raise ValueError("Invalid token format.") from exc

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    signature = _b64url_decode(signature_b64)
    if not hmac.compare_digest(signature, expected_signature):
        raise ValueError("Invalid token signature.")

    payload_raw = _b64url_decode(payload_b64)
    payload = json.loads(payload_raw.decode("utf-8"))
    exp = payload.get("exp")
    if not isinstance(exp, int):
        raise ValueError("Invalid token expiration.")

    now_ts = int(datetime.now(timezone.utc).timestamp())
    if now_ts >= exp:
        raise ValueError("Token expired.")
    return payload
