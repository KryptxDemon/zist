from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE_PATH = BASE_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "Zist API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = "sqlite:///./zist.db"

    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    BACKEND_CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    )

    TMDB_API_KEY: str | None = None
    TMDB_BASE_URL: str = "https://api.themoviedb.org/3"
    GROQ_API_KEY: str | None = None
    # Groq rotates/decommissions models regularly. Use a comma-separated chain so
    # the service has automatic fallbacks if the primary model is removed.
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GROQ_MODEL_FALLBACKS: str = "qwen/qwen3.6-27b,groq/compound-mini,openai/gpt-oss-20b"

    @property
    def groq_model_chain(self) -> list[str]:
        """Ordered list of Groq models to try, primary first."""
        candidates: list[str] = []
        for raw in (self.GROQ_MODEL, self.GROQ_MODEL_FALLBACKS):
            if not raw:
                continue
            for piece in str(raw).split(","):
                name = piece.strip()
                if name and name not in candidates:
                    candidates.append(name)
        return candidates

    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    FRONTEND_URL: str = "http://localhost:5173"

    OPENLIBRARY_BASE_URL: str = "https://openlibrary.org"

    WIKIPEDIA_API_BASE: str = "https://en.wikipedia.org/api/rest_v1"

    DICTIONARY_API_BASE: str = "https://api.dictionaryapi.dev/api/v2/entries/en"

    # JWKS URL for verifying external JWTs (e.g., Neon Auth)
    JWKS_URL: str | None = None

    # Optional issuer to require on externally-verified JWTs (Neon Auth).
    # When set, ``_verify_with_jwks`` enforces ``claims["iss"] == this``.
    NEON_AUTH_ISSUER: str | None = None

    @property
    def cors_origins(self) -> list[str]:
        value = self.BACKEND_CORS_ORIGINS.strip()
        if not value:
            return []
        if value.startswith("[") and value.endswith("]"):
            import json

            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except Exception:
                pass
        return [item.strip() for item in value.split(",") if item.strip()]


settings = Settings()