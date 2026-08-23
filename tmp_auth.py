from __future__ import annotations

import base64
import hashlib
import hmac
import html
import json
import re
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    AuthUserResponse,
    DisplayNameAvailabilityResponse,
    GoogleAuthStartResponse,
    LoginRequest,
    SignupRequest,
    TokenResponse,
)

router = APIRouter()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
STATE_MAX_AGE_MINUTES = 10


def _auth_user_response(user: User) -> AuthUserResponse:
    return AuthUserResponse.model_validate(user)


def _is_display_name_taken(db: Session, display_name: str) -> bool:
    normalized = display_name.strip().lower()
    return (
        db.query(User)
        .filter(func.lower(User.display_name) == normalized)
        .first()
        is not None
    )


def _sanitize_display_name(display_name: str) -> str:
    cleaned = re.sub(r"[^\w\s.-]", "", display_name, flags=re.UNICODE).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        return "ZistUser"
    if len(cleaned) < 2:
        return f"{cleaned}User"
    return cleaned[:100]


def _display_name_suggestions(
    db: Session,
    display_name: str,
    first_name: str | None = None,
    last_name: str | None = None,
) -> list[str]:
    base_candidates: list[str] = []
    if first_name and last_name:
        base_candidates.extend(
            [
                f"{first_name}{last_name}",
                f"{first_name}.{last_name}",
                f"{first_name}_{last_name}",
            ]
        )
    base_candidates.append(display_name)

    suggestions: list[str] = []
    for candidate in base_candidates:
        normalized = _sanitize_display_name(candidate)
        for suffix in ("", "1", "2", "3", "_zist", "_learns"):
            option = f"{normalized}{suffix}"
            if len(option) < 2 or len(option) > 100:
                continue
            if not _is_display_name_taken(db, option) and option not in suggestions:
                suggestions.append(option)
            if len(suggestions) >= 5:
                return suggestions

    return suggestions or [f"{_sanitize_display_name(display_name)}1"]


def _next_available_display_name(db: Session, preferred: str) -> str:
    base = _sanitize_display_name(preferred)
    if not _is_display_name_taken(db, base):
        return base

    for suffix in range(1, 1000):
        candidate = f"{base}{suffix}"
        if not _is_display_name_taken(db, candidate):
            return candidate

    return f"{base}_{secrets.token_hex(3)}"


def _sign_state(payload: dict) -> str:
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), raw, hashlib.sha256).hexdigest()
    encoded = base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")
    return f"{encoded}.{signature}"


def _unsign_state(state: str | None) -> dict:
    if not state or "." not in state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Google auth state")

    encoded, signature = state.rsplit(".", 1)
    padding = "=" * (-len(encoded) % 4)
    try:
        raw = base64.urlsafe_b64decode(f"{encoded}{padding}".encode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Google auth state") from exc

    expected_signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        raw,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Google auth state")

    payload = json.loads(raw.decode("utf-8"))
    timestamp = datetime.fromisoformat(payload["ts"])
    if datetime.now(UTC) - timestamp > timedelta(minutes=STATE_MAX_AGE_MINUTES):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google auth state expired")

    return payload


def _build_google_auth_url(request: Request, source: str) -> str:
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )

    callback_url = str(request.url_for("google_callback"))
    state = _sign_state(
        {
            "source": source,
            "ts": datetime.now(UTC).isoformat(),
            "nonce": secrets.token_urlsafe(12),
        }
    )
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": callback_url,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state,
        "include_granted_scopes": "true",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def _google_userinfo_to_user(db: Session, payload: dict) -> User:
    email = str(payload.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google account did not return an email address")

    google_sub = str(payload.get("sub") or "").strip()
    if not google_sub:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google account id is missing")

    first_name = str(payload.get("given_name") or "").strip() or None
    last_name = str(payload.get("family_name") or "").strip() or None
    full_name = str(payload.get("name") or "").strip()
    picture = str(payload.get("picture") or "").strip() or None
    email_verified = bool(payload.get("email_verified", False))

    existing_user = (
        db.query(User)
        .filter(or_(func.lower(User.email) == email, User.google_sub == google_sub))
        .first()
    )

    if existing_user:
        existing_user.google_sub = google_sub
        existing_user.first_name = existing_user.first_name or first_name
        existing_user.last_name = existing_user.last_name or last_name
        existing_user.email_verified = existing_user.email_verified or email_verified
        if picture and not existing_user.avatar_url:
            existing_user.avatar_url = picture
        if full_name and not existing_user.display_name:
            existing_user.display_name = _next_available_display_name(db, full_name)
        db.commit()
        db.refresh(existing_user)
        return existing_user

    preferred_display_name = full_name or "".join(filter(None, [first_name, last_name])) or email.split("@")[0]
    display_name = _next_available_display_name(db, preferred_display_name)

    user = User(
        email=email,
        hashed_password=get_password_hash(secrets.token_urlsafe(32)),
        display_name=display_name,
        first_name=first_name,
        last_name=last_name,
        google_sub=google_sub,
        email_verified=email_verified,
        avatar_url=picture,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _build_popup_html(payload: dict) -> str:
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    safe_payload = html.escape(json.dumps(payload, separators=(",", ":")), quote=True)
    safe_origin = html.escape(frontend_url, quote=True)
    return f"""<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <title>Zist Google Sign-In</title>
  </head>
  <body data-payload=\"{safe_payload}\" data-origin=\"{safe_origin}\">
    <script>
      (function () {{
        const payload = JSON.parse(document.body.getAttribute('data-payload') || '{{}}');
        const targetOrigin = document.body.getAttribute('data-origin') || window.location.origin;
        if (window.opener) {{
          window.opener.postMessage({{ type: 'zist-google-auth', payload }}, targetOrigin);
        }}
        window.close();
      }})();
    </script>
  </body>
</html>"""


@router.get("/check-display-name", response_model=DisplayNameAvailabilityResponse)
def check_display_name(display_name: str, db: Session = Depends(get_db)):
    normalized = _sanitize_display_name(display_name)
    available = not _is_display_name_taken(db, normalized)
    suggestions = [] if available else _display_name_suggestions(db, normalized)
    return DisplayNameAvailabilityResponse(
        display_name=normalized,
        available=available,
        suggestions=suggestions,
    )


@router.get("/google/start", response_model=GoogleAuthStartResponse)
def google_start(request: Request, source: str = "login"):
    source = source if source in {"login", "signup"} else "login"
    auth_url = _build_google_auth_url(request, source)
    return GoogleAuthStartResponse(auth_url=auth_url)


@router.get("/google/callback", name="google_callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Google authorization code")

    _ = _unsign_state(state)

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )

    callback_url = str(request.url_for("google_callback"))

    async with httpx.AsyncClient(timeout=20) as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": callback_url,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token_response.raise_for_status()
        token_data = token_response.json()

        access_token = str(token_data.get("access_token") or "")
        if not access_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google access token missing")

        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        userinfo_response.raise_for_status()
        userinfo = userinfo_response.json()

    user = _google_userinfo_to_user(db, userinfo)
    response_payload = {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
        "user": _auth_user_response(user).model_dump(mode="json"),
    }

    return HTMLResponse(content=_build_popup_html(response_payload))


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    normalized_email = str(payload.email).strip().lower()
    display_name = _sanitize_display_name(payload.display_name)

    if _is_display_name_taken(db, display_name):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Display name is already taken",
                "suggestions": _display_name_suggestions(
                    db,
                    display_name,
                    payload.first_name,
                    payload.last_name,
                ),
            },
        )

    existing_user = (
        db.query(User)
        .filter(func.lower(User.email) == normalized_email)
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered",
        )

    user = User(
        email=normalized_email,
        hashed_password=get_password_hash(payload.password),
        display_name=display_name,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return AuthResponse(
        user=_auth_user_response(user),
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        ),
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    normalized_email = str(payload.email).strip().lower()

    user = (
        db.query(User)
        .filter(func.lower(User.email) == normalized_email)
        .first()
    )

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return AuthResponse(
        user=_auth_user_response(user),
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        ),
    )


@router.get("/me", response_model=AuthUserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _auth_user_response(current_user)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    _ = current_user
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
def forgot_password(email: str):
    _ = email
    return {"message": "If this email exists, a reset link has been sent."}
