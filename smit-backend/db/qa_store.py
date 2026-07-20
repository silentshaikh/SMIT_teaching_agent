"""Persistent Q&A store backed by SQLite via SQLAlchemy."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.db_models import QAModel
from db.session import AsyncSessionLocal


class QAStore:
    async def add(self, submission_id: str, question: str, answer_en: str, answer_urdu: str) -> dict:
        pair = {
            "question": question,
            "answer_en": answer_en,
            "answer_urdu": answer_urdu,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        async with AsyncSessionLocal() as session:
            db_qa = QAModel(
                submission_id=submission_id,
                question=question,
                answer_en=answer_en,
                answer_urdu=answer_urdu,
            )
            session.add(db_qa)
            await session.commit()
        return pair

    async def get(self, submission_id: str) -> list[dict]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(QAModel)
                .where(QAModel.submission_id == submission_id)
                .order_by(QAModel.created_at.asc())
            )
            rows = result.scalars().all()
            return [
                {
                    "question": row.question,
                    "answer_en": row.answer_en,
                    "answer_urdu": row.answer_urdu,
                    "created_at": row.created_at.isoformat(),
                }
                for row in rows
            ]


qa_store = QAStore()
