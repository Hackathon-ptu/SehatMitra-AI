"""
Seed (or re-seed) the ASHA portal demo village.

    cd backend
    python -m scripts.seed_asha_demo          # seed if missing
    python -m scripts.seed_asha_demo --reset  # wipe the demo ASHA's data and seed fresh dates
"""
import sys

import app.models  # noqa: F401 — registers every table
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.services.asha.demo_seed import seed_asha_demo


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print(seed_asha_demo(db, reset="--reset" in sys.argv) or "Demo ASHA already exists (use --reset to re-seed)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
