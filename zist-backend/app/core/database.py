from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


# Configure engine defaults for each database type.
engine_kwargs = {"future": True}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Neon/Render connections can be dropped after idle periods.
    # pre_ping + recycle helps avoid reusing stale SSL connections.
    connect_args = {
        "sslmode": "require",
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }
    engine_kwargs.update(
        {
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "pool_size": 5,
            "max_overflow": 10,
            "pool_timeout": 30,
            "pool_use_lifo": True,
        }
    )

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, **engine_kwargs)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def ensure_user_profile_columns() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    statements: list[str] = []

    if "first_name" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN first_name VARCHAR")
    if "last_name" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN last_name VARCHAR")
    if "google_sub" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN google_sub VARCHAR")
    if "email_verified" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE")
    if "website_url" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN website_url VARCHAR")
    if "instagram_url" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN instagram_url VARCHAR")
    if "x_url" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN x_url VARCHAR")
    if "github_url" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN github_url VARCHAR")
    if "linkedin_url" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN linkedin_url VARCHAR")
    if "youtube_url" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN youtube_url VARCHAR")

    if not statements:
        unique_indexes = {index["name"] for index in inspector.get_indexes("users")}
        if "ix_users_google_sub" not in unique_indexes:
            statements.append("CREATE UNIQUE INDEX ix_users_google_sub ON users (google_sub)")
        else:
            return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))