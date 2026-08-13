"""FastAPI dependency providers.

The auth dependency tries to verify the incoming bearer token by:

1. Attempting verification with the application's ``SECRET_KEY`` (HS256). This
   preserves backwards compatibility with the existing app-issued JWTs.
2. Falling back to JWKS verification when the first attempt fails and
   ``JWKS_URL`` is configured. This allows external identity providers such as
   Neon Auth to authenticate against the API using RS256 tokens.

The JWKS implementation includes a small TTL cache, supports refresh on unknown
``kid`` lookups, and uses sensible HTTP timeouts so a slow upstream does not
hold requests open.
"""

from __future__ import annotations

import threading
import time
from collections.abc import Generator
from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from jose.utils import base64url_decode
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User


security = HTTPBearer()


# Algorithms accepted for publicly-signed tokens (verified via JWKS).
JWKS_ALGORITHMS: tuple[str, ...] = ("RS256", "RS384", "RS512", "ES256", "ES384")


class _JWKSCache:
    """Tiny TTL cache for JWKS responses.

    Caching lets us avoid hitting the upstream JWKS endpoint on every request
    while still allowing fresh keys to be picked up after the TTL expires.
    On an unknown ``kid`` we force a single refresh by invalidating the cache.
    """

    def __init__(self, ttl_seconds: int = 300) -> None:
        self._ttl_seconds = ttl_seconds
        self._lock = threading.Lock()
        self._keys: list[dict[str, Any]] = []
        self._fetched_at: float = 0.0

    def get_keys(self, force_refresh: bool = False) -> list[dict[str, Any]]:
        now = time.time()
        with self._lock:
            fresh = (now - self._fetched_at) < self._ttl_seconds
            if force_refresh or not fresh or not self._keys:
                self._keys = self._fetch_keys()
                self._fetched_at = now
            return list(self._keys)

    def _fetch_keys(self) -> list[dict[str, Any]]:
        if not settings.JWKS_URL:
            raise RuntimeError("JWKS_URL is not configured")

        try:
            response = httpx.get(settings.JWKS_URL, timeout=5.0)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to fetch JWKS",
            ) from exc

        try:
            payload = response.json()
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid JWKS payload",
            ) from exc

        keys = payload.get("keys") if isinstance(payload, dict) else None
        if not isinstance(keys, list):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="JWKS payload missing keys",
            )
        return keys


_jwks_cache = _JWKSCache()


def _select_jwk(keys: list[dict[str, Any]], kid: str | None) -> dict[str, Any] | None:
    if not keys:
        return None
    if kid is not None:
        for entry in keys:
            if isinstance(entry, dict) and entry.get("kid") == kid:
                return entry
        # A specific kid was requested but not present in the cache. Returning
        # ``None`` here lets the caller trigger a single refresh instead of
        # silently accepting an unrelated key.
        return None
    if len(keys) == 1:
        return keys[0]
    return None


def _verify_with_jwks(token: str) -> dict[str, Any]:
    """Verify a JWT signature using the configured JWKS endpoint.

    Returns the decoded claims if successful. Raises ``HTTPException`` on any
    verification failure (bad signature, unknown kid, expired token, etc.).
    """
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header",
        ) from exc

    kid = unverified_header.get("kid")
    algorithm = unverified_header.get("alg")
    if algorithm not in JWKS_ALGORITHMS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unsupported token algorithm",
        )

    keys = _jwks_cache.get_keys()
    key = _select_jwk(keys, kid)
    if key is None and kid is not None:
        # Force a single refresh in case the active kid rotated.
        keys = _jwks_cache.get_keys(force_refresh=True)
        key = _select_jwk(keys, kid)
    if key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No matching JWK found",
        )

    try:
        constructed = jwk.construct(key)
        signing_input, encoded_sig = token.rsplit(".", 1)
        sig = base64url_decode(encoded_sig.encode("utf-8"))
        if not constructed.verify(signing_input.encode("utf-8"), sig):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token signature",
            )
    except HTTPException:
        raise
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to verify token",
        ) from exc

    claims = jwt.get_unverified_claims(token)
    exp = claims.get("exp")
    if exp is not None and time.time() > float(exp):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    return claims


def _decode_with_app_secret(token: str) -> dict[str, Any] | None:
    """Decode app-issued tokens. Returns ``None`` on failure instead of raising."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

    # ``verified_via`` records how the token was validated so we can apply the
    # right shape rules. Internal HS256 tokens MUST carry ``type=access``;
    # externally verified JWKS tokens (e.g. Neon Auth) typically don't carry a
    # ``type`` claim and are accepted as long as a ``sub`` is present.
    verified_via: str | None = None
    payload = _decode_with_app_secret(token)
    if payload is not None:
        verified_via = "app_secret"
    elif settings.JWKS_URL:
        try:
            payload = _verify_with_jwks(token)
            verified_via = "jwks"
        except HTTPException:
            raise credentials_exception

    if payload is None:
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    token_type: str | None = payload.get("type")
    if verified_via == "app_secret" and token_type != "access":
        raise credentials_exception
    if verified_via == "jwks" and token_type is not None and token_type != "access":
        # External tokens may declare a type, but refuse anything that is
        # explicitly *not* an access token (e.g. a refresh token).
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise credentials_exception
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    return current_user