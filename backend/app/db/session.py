"""Database engine and session configuration.

Two modes, selected by environment variables:

* Development  -> local SQLite file (``DATABASE_URL``).
* Staging/Prod -> Turso Cloud over libSQL (``TURSO_DATABASE_URL`` +
  ``TURSO_AUTH_TOKEN``).

In production the application refuses to start unless Turso is fully
configured. It must never silently fall back to a local SQLite file,
because that file is invisible to every other instance and is lost on
redeploy.
"""

import os
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

IS_PRODUCTION = settings.APP_ENV.strip().lower() in {"production", "prod"}

turso_url = (settings.TURSO_DATABASE_URL or "").strip()
turso_token = (settings.TURSO_AUTH_TOKEN or "").strip()
use_turso = bool(turso_url and turso_token)


def _build_engine() -> Engine:
    if use_turso:
        # Turso's SQLAlchemy dialect expects the "sqlite+libsql://" scheme.
        # settings.TURSO_DATABASE_URL is stored as "libsql://<host>".
        url = turso_url
        if url.startswith("libsql://"):
            url = f"sqlite+{url}"
        elif not url.startswith("sqlite+libsql://"):
            raise RuntimeError(
                "TURSO_DATABASE_URL must start with 'libsql://' "
                "(for example libsql://<db>-<org>.<region>.turso.io)"
            )
        if "?" not in url:
            url = f"{url}?secure=true"

        # The token travels in connect_args, never in the URL, so it cannot
        # leak into logs, tracebacks or engine reprs.
        return create_engine(
            url,
            connect_args={"auth_token": turso_token},
            pool_pre_ping=True,
        )

    # 1. Normalize Database URL
    raw_db_url = getattr(settings, "DATABASE_URL", None) or os.getenv("DATABASE_URL", "sqlite:///./sehatmitra.db")

    # Fix Heroku/Render legacy postgres prefix
    if raw_db_url.startswith("postgres://"):
        database_url = raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        database_url = raw_db_url

    # 2. Configure dialect-specific connection arguments
    engine_kwargs = {
        "pool_pre_ping": True,
    }

    # Only standard local SQLite supports check_same_thread
    if database_url.startswith("sqlite") and not database_url.startswith("sqlite+libsql"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    else:
        engine_kwargs["connect_args"] = {}

    # 3. Instantiate Engine
    return create_engine(database_url, **engine_kwargs)


engine = _build_engine()


@event.listens_for(engine, "connect")
def _enforce_foreign_keys(dbapi_connection, connection_record):
    """SQLite and libSQL disable foreign keys per connection by default."""
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    except Exception:
        # Never take the application down over a PRAGMA; surfaced by tests.
        pass


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def describe_engine() -> str:
    """Human-readable engine description with no credentials in it."""
    raw_db_url = getattr(settings, "DATABASE_URL", None) or os.getenv("DATABASE_URL", "sqlite:///./sehatmitra.db")
    return f"turso ({turso_url})" if use_turso else f"local ({raw_db_url})"


# Dependency injection for endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
