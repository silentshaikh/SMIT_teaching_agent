import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from models.db_models import Base

logger = logging.getLogger(__name__)

DATABASE_URL = "sqlite+aiosqlite:///./smit.db"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Migration: add approval columns to submissions if missing
        result = await conn.execute(
            text("PRAGMA table_info(submissions)")
        )
        columns = {row[1] for row in result.fetchall()}

        for col_name, col_def in [
            ("approval_status", "VARCHAR(16) NOT NULL DEFAULT 'pending'"),
            ("reviewed_by", "VARCHAR(36)"),
            ("reviewed_at", "DATETIME"),
        ]:
            if col_name not in columns:
                logger.info("Migrating: adding submissions.%s", col_name)
                await conn.execute(
                    text(f"ALTER TABLE submissions ADD COLUMN {col_name} {col_def}")
                )


async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
