from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./servesense.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)

Base = declarative_base()

# Additive SQLite column patches. create_all() will not alter existing tables.
_COLUMN_PATCHES = {
    "notifications": [("read_at", "DATETIME")],
    "organizations": [
        ("description", "TEXT"),
        ("verified", "BOOLEAN DEFAULT 1"),
    ],
}


def ensure_schema():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        for table, columns in _COLUMN_PATCHES.items():
            existing = [
                row[1]
                for row in conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
            ]
            if not existing:
                continue
            for name, ddl in columns:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
        conn.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
