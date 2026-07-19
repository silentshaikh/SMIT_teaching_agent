"""In-memory store for report Q&A pairs. Ephemeral — resets on server restart."""

from collections import defaultdict
from datetime import datetime, timezone


class QAStore:
    def __init__(self):
        self._store: dict[str, list[dict]] = defaultdict(list)

    def add(self, submission_id: str, question: str, answer_en: str, answer_urdu: str) -> dict:
        pair = {
            "question": question,
            "answer_en": answer_en,
            "answer_urdu": answer_urdu,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._store[submission_id].append(pair)
        return pair

    def get(self, submission_id: str) -> list[dict]:
        return list(self._store[submission_id])


qa_store = QAStore()
