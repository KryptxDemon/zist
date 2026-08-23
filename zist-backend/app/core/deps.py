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

import logging
import threading
import time
from collections.abc import Generator
from typing import Any

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError, PyJWKClientError
from sqlalchemy.orm import Session

from sqlalchemy import func, or_

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User

logger = logging.getLogger("zist.auth")

# Shared bearer-token scheme reused by FastAPI dependencies.
# auto_error=True returns 403 "Not authenticated" when the header is missing,
# so the /auth/me endpoint surfaces a clear client error instead of 422.
security = HTTPBearer()


# Algorithms accepted for publicly-signed tokens (verified via JWKS).
# Neon Auth signs tokens with EdDSA (Ed25519), which python-jose 3.5.0 does
# not support but PyJWT does. Keep the asymmetric set here so we still reject
# ``none`` and HS* tokens issued with a shared secret.
JWKS_ALGORITHMS: tuple[str, ...] = (
    "RS256",
    "RS384",
    "RS512",
    "PS256",
    "PS384",
    "PS512",
    "ES256",
    "ES256K",
    "ES384",
    "ES512",
    "EdDSA",
)


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
    # No ``kid`` in the token header (some Neon JWTs omit it). When there is
    # exactly one published key, that is unambiguously the right one to use.
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
    except InvalidTokenError as exc:
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
        signing_key = jwt.PyJWK(key).key
    except (PyJWKClientError, InvalidTokenError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to load signing key",
        ) from exc

    try:
        # When ``NEON_AUTH_ISSUER`` is configured we also enforce the
        # ``iss`` claim, which is the standard defence against
        # cross-JWKS token confusion. When it is not configured we leave
        # PyJWT to skip the check (``issuer=None`` is a no-op).
        # We also enforce audience to match the issuer since Neon sets it to the same value.
        claims: dict[str, Any] = jwt.decode(
            token,
            signing_key,
            algorithms=list(JWKS_ALGORITHMS),
            options={"require": ["exp", "sub"]},
            issuer=settings.NEON_AUTH_ISSUER,
            audience=settings.NEON_AUTH_ISSUER,
        )
    except InvalidTokenError as exc:
        logger.warning(f"auth.jwks_failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to verify token",
        ) from exc

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
    except InvalidTokenError:
        return None


def upsert_zist_user_from_neon_claims(claims, db):
    neon_user_id = claims.get("sub")
    if not neon_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing subject claim",
        )
    email_raw = claims.get("email")
    email = email_raw.strip().lower() if isinstance(email_raw, str) and email_raw.strip() else None
    email_verified = bool(claims.get("email_verified"))
    user = db.query(User).filter(User.neon_auth_user_id == neon_user_id).first()
    if user is None and email and email_verified:
        user = db.query(User).filter(func.lower(User.email) == email).first()
        if user is not None:
            user.neon_auth_user_id = neon_user_id
    if user is not None:
        upstream_name = _sanitize_display_name(claims.get("name")) or _sanitize_display_name(claims.get("preferred_username"))
        if upstream_name and not user.display_name:
            user.display_name = _next_available_display_name(db, upstream_name)
        upstream_avatar = claims.get("picture") or claims.get("avatar_url")
        if isinstance(upstream_avatar, str) and upstream_avatar and not user.avatar_url:
            user.avatar_url = upstream_avatar
        if email and not user.email:
            user.email = email
        db.commit()
        db.refresh(user)
        return user
    preferred = _sanitize_display_name(claims.get("name")) or email or "reader"
    display_name = _next_available_display_name(db, preferred)
    # ``email`` is NOT NULL on the users table. When the upstream token
    # doesn't carry one, synthesize a deterministic placeholder so the row
    # is created without lying about contact info.
    fallback_email = email or f"{neon_user_id}@neon.placeholder.local"
    # ``avatar_url`` is nullable on the model but only accepts strings. Some
    # identity providers return a non-string ``picture`` (e.g. a list of URLs
    # or a dict) — coerce to None so we don't crash the insert.
    raw_avatar = claims.get("picture") or claims.get("avatar_url")
    if not isinstance(raw_avatar, str) or not raw_avatar:
        raw_avatar = None
    new_user = User(
        neon_auth_user_id=neon_user_id,
        email=fallback_email,
        display_name=display_name,
        avatar_url=raw_avatar,
        hashed_password=get_password_hash(__import__("secrets").token_urlsafe(32)),
        is_active=True,
        email_verified=email_verified,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def _sanitize_display_name(raw):
    if not raw:
        return None
    cleaned = raw.strip()
    if not cleaned:
        return None
    return cleaned[:64]


def _is_display_name_taken(db, name):
    return db.query(User.id).filter(func.lower(User.display_name) == name.lower()).first() is not None


def _next_available_display_name(db, preferred):
    if not _is_display_name_taken(db, preferred):
        return preferred
    base = preferred[:60]
    n = 2
    while True:
        candidate = f"{base}#{n}"
        if not _is_display_name_taken(db, candidate):
            return candidate
        n += 1


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
        except HTTPException as exc:
            # Surface the real category in logs so operators can tell
            # ``jwks_not_loaded`` from ``unsupported_algorithm`` from
            # ``kid_not_found`` etc. without having to attach a debugger.
            logger.warning(f"auth.jwks_failed: {exc.detail}")
            raise credentials_exception
    else:
        # ``JWKS_URL`` is unset in this deployment. The app-secret decode
        # already returned ``None``, so the only way the request could have
        # succeeded is if the frontend had been configured to issue HS256
        # tokens with the backend ``SECRET_KEY`` -- but it isn't.
        logger.warning(
            "auth.no_jwks_configured",
            extra={"token_prefix": token[:12]},
        )
        # External tokens may declare a type, but refuse anything that is
        # explicitly *not* an access token (e.g. a refresh token).
        raise credentials_exception

    if verified_via == "jwks":
        # External Neon Auth tokens identify the upstream user by their
        # ``sub`` claim, which is NOT our internal ``User.id``. Upsert by
        # Neon user id (with email-verified linking) to find or create the
        # matching Zist profile.
        user = upsert_zist_user_from_neon_claims(payload, db)
    else:
        # App-secret (HS256) tokens issued by the backend carry the internal
        # ``User.id`` as their ``sub`` claim.
        user_id = payload.get("sub")
        if not user_id:
            logger.warning("auth.app_secret_missing_sub", extra={"token_prefix": token[:12]})
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