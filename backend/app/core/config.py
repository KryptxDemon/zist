from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
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

    OPENLIBRARY_BASE_URL: str = "https://openlibrary.org"

    WIKIPEDIA_API_BASE: str = "https://en.wikipedia.org/api/rest_v1"

    DICTIONARY_API_BASE: str = "https://api.dictionaryapi.dev/api/v2/entries/en"

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