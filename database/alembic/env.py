import sys
from os.path import abspath, dirname
from logging.config import fileConfig

from sqlalchemy import create_engine
from sqlalchemy import pool

from alembic import context

# Project root path add karo taaki app imports chal sakein
sys.path.insert(0, dirname(dirname(dirname(abspath(__file__)))) + "/backend")

from app.core.config import settings
from app.models import Base

# Alembic Config object
config = context.config

# Logging configuration
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Database metadata for autogenerate
target_metadata = Base.metadata

_turso_url = (settings.TURSO_DATABASE_URL or "").strip()
_turso_token = (settings.TURSO_AUTH_TOKEN or "").strip()
_use_turso = bool(_turso_url and _turso_token)


def _sqlalchemy_url() -> str:
    """Connection URL WITHOUT any credentials embedded in it."""
    if _use_turso:
        url = _turso_url
        if url.startswith("libsql://"):
            url = f"sqlite+{url}"
        if "?" not in url:
            url = f"{url}?secure=true"
        return url
    return settings.DATABASE_URL or "sqlite:///./sehatmitra.db"


def _connect_args() -> dict:
    """Secrets are passed here only, never through the URL."""
    return {"auth_token": _turso_token} if _use_turso else {}


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (SQL script generation)."""
    context.configure(
        url=_sqlalchemy_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = create_engine(
        _sqlalchemy_url(),
        connect_args=_connect_args(),
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # SQLite/libSQL need foreign keys enabled explicitly.
        try:
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")
        except Exception:
            pass

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Required so SQLite/libSQL can ALTER tables via table rebuild.
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
