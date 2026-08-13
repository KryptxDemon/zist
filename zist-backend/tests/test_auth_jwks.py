"""Tests for the JWKS verification path in ``app.core.deps``.

These tests do not require a live database or HTTP server. They:

- generate an in-memory RSA keypair,
- monkeypatch ``_JWKSCache._fetch_keys`` to return a chosen JWKS, and
- exercise ``_verify_with_jwks`` / ``_decode_with_app_secret`` directly.
"""

from __future__ import annotations

import time
from typing import Any

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from jose import jwk, jwt
from jose.utils import long_to_base64

from app.core import deps
from app.core.config import settings


@pytest.fixture(autouse=True)
def _reset_jwks_cache() -> None:
    """Reset the module-level JWKS cache before each test.

    The cache is a module-level singleton, so state (keys, fetched_at) can
    leak between tests. Each test starts with an empty cache and a fresh
    epoch so the patched fetch is always invoked.
    """
    deps._jwks_cache._keys = []
    deps._jwks_cache._fetched_at = 0.0


# ---------------------------------------------------------------------------
# Helpers


def _generate_rsa_keypair() -> tuple[dict[str, Any], dict[str, str]]:
    """Return (public_jwk, {"pem": private_pem}) for an in-memory RSA keypair."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_numbers = private_key.public_key().public_numbers()

    kid = f"test-{int(time.time() * 1000)}"
    public_jwk: dict[str, Any] = {
        "kty": "RSA",
        "kid": kid,
        "use": "sig",
        "alg": "RS256",
        "n": long_to_base64(public_numbers.n).decode("ascii"),
        "e": long_to_base64(public_numbers.e).decode("ascii"),
    }

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("ascii")

    return public_jwk, {"pem": private_pem, "kid": kid}


def _base_claims() -> dict[str, Any]:
    return {
        "sub": "00000000-0000-0000-0000-000000000000",
        "type": "access",
        "iat": int(time.time()),
        "exp": int(time.time()) + 300,
    }


def _sign_token(
    claims: dict[str, Any], private_pem: str, *, kid: str | None = None
) -> str:
    headers = {"kid": kid} if kid else None
    return jwt.encode(claims, private_pem, algorithm="RS256", headers=headers)


def _patched_fetch(keys: list[dict[str, Any]]):
    """Return a stand-in for ``_JWKSCache._fetch_keys`` returning ``keys``."""

    def _fetch(_self: Any) -> list[dict[str, Any]]:
        return keys

    return _fetch


# ---------------------------------------------------------------------------
# Tests


def test_valid_rs256_token_is_accepted(monkeypatch: pytest.MonkeyPatch) -> None:
    public_jwk, private_key = _generate_rsa_keypair()
    monkeypatch.setattr(deps._JWKSCache, "_fetch_keys", _patched_fetch([public_jwk]))

    token = _sign_token(_base_claims(), private_key["pem"], kid=public_jwk["kid"])
    claims = deps._verify_with_jwks(token)
    assert claims["type"] == "access"
    assert "sub" in claims


def test_unknown_kid_triggers_refresh(monkeypatch: pytest.MonkeyPatch) -> None:
    public_jwk, private_key = _generate_rsa_keypair()

    # Initial fetch returns an unrelated key, but after refresh we serve the
    # real one. We simulate this by rotating the cache contents.
    placeholder_key = dict(public_jwk)
    placeholder_key["kid"] = "other-key"

    refresh_calls = {"count": 0}
    cache_state = {"current": [placeholder_key]}

    def _fetch(_self: Any) -> list[dict[str, Any]]:
        refresh_calls["count"] += 1
        # Second call returns the real key.
        if refresh_calls["count"] >= 2:
            cache_state["current"] = [public_jwk]
        return cache_state["current"]

    monkeypatch.setattr(deps._JWKSCache, "_fetch_keys", _fetch)

    token = _sign_token(_base_claims(), private_key["pem"], kid=public_jwk["kid"])
    # The verifier must force-refresh once when the active kid is not in the
    # cache, then succeed once the rotated keys are loaded.
    claims = deps._verify_with_jwks(token)
    assert claims["type"] == "access"
    assert refresh_calls["count"] >= 2


def test_expired_token_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    public_jwk, private_key = _generate_rsa_keypair()
    monkeypatch.setattr(deps._JWKSCache, "_fetch_keys", _patched_fetch([public_jwk]))

    expired = _base_claims()
    expired["exp"] = int(time.time()) - 120  # already expired two minutes ago
    token = _sign_token(expired, private_key["pem"], kid=public_jwk["kid"])

    with pytest.raises(HTTPException) as exc_info:
        deps._verify_with_jwks(token)
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


def test_token_signed_with_untrusted_key_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    trusted_jwk, _ = _generate_rsa_keypair()
    _, attacker = _generate_rsa_keypair()

    monkeypatch.setattr(
        deps._JWKSCache, "_fetch_keys", _patched_fetch([trusted_jwk])
    )

    token = _sign_token(_base_claims(), attacker["pem"], kid=trusted_jwk["kid"])

    with pytest.raises(HTTPException) as exc_info:
        deps._verify_with_jwks(token)
    assert exc_info.value.status_code == 401


def test_app_secret_decode_returns_none_on_invalid_token() -> None:
    assert deps._decode_with_app_secret("not-a-real-jwt") is None
    assert deps._decode_with_app_secret("a.b.c") is None


def test_jwks_disabled_falls_back_to_credentials_exception(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from fastapi import HTTPException as _HTTPException

    # Disable JWKS verification entirely.
    monkeypatch.setattr(settings, "JWKS_URL", None)
    monkeypatch.setattr(settings, "SECRET_KEY", "x" * 32)
    monkeypatch.setattr(settings, "ALGORITHM", "HS256")

    with pytest.raises(_HTTPException) as exc_info:
        deps.get_current_user.__wrapped__ if False else _raise_for_bad_token()  # type: ignore[func-returns-value]

    assert exc_info.value.status_code == 401


def _raise_for_bad_token() -> None:
    """Helper used by ``test_jwks_disabled_falls_back_to_credentials_exception``.

    Invokes ``get_current_user`` with a junk token, expecting a 401 because
    JWKS is disabled and the HS256 decode also fails.
    """
    from fastapi.security import HTTPAuthorizationCredentials

    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="garbage")
    deps.get_current_user(credentials=creds, db=None)  # type: ignore[arg-type]


def test_jwks_construct_helper_round_trip() -> None:
    """Sanity check: ``jwk.construct`` works on a dict produced by our helper."""
    public_jwk, _ = _generate_rsa_keypair()
    key = jwk.construct(public_jwk)
    assert key is not None