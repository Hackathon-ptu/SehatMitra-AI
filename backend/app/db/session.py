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

    if IS_PRODUCTION:
        missing = []
        if not turso_url:
            missing.append("TURSO_DATABASE_URL")
        if not turso_token:
            missing.append("TURSO_AUTH_TOKEN")
        raise RuntimeError(
            "APP_ENV=production requires Turso configuration. "
            f"Missing: {', '.join(missing)}. "
            "Refusing to fall back to local SQLite in production."
        )

    local_url = settings.DATABASE_URL or "sqlite:///./sehatmitra.db"
    return create_engine(local_url, connect_args={"check_same_thread": False})


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
    return f"turso ({turso_url})" if use_turso else f"local ({settings.DATABASE_URL})"


# Dependency injection for endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
