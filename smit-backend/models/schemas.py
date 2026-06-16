from pydantic import BaseModel
from typing import Literal
from uuid import UUID
from datetime import datetime


# ── Core input ─────────────────────────────────────
class SubmissionInput(BaseModel):
    student_id: str
    assignment_name: str
    language: Literal["javascript", "python", "html"]
    code: str                    # raw source code string
    rubric_id: str                # links to Qdrant rubric


# ── Agent output models ─────────────────────────────
class MistakeItem(BaseModel):
    line: int | None
    type: Literal["syntax", "logic", "naming", "structure", "style"]
    description: str             # English explanation
    description_urdu: str        # Roman Urdu explanation
    corrected_snippet: str | None


class CodeReviewResult(BaseModel):
    mistakes: list[MistakeItem]
    corrected_code: str
    has_critical_errors: bool


class TutorOutput(BaseModel):
    explanation_en: str          # English walkthrough
    explanation_urdu: str        # Roman Urdu walkthrough
    concepts_covered: list[str]


class RubricScore(BaseModel):
    score: int                   # 0–100
    grade: str                   # A / B / C / D / F
    breakdown: dict[str, int]    # criterion -> points earned


class FeedbackOutput(BaseModel):
    suggestions: list[str]       # 3-5 personalized items
    next_topics: list[str]       # what to study next


# ── Final unified report ────────────────────────────
class AssignmentReport(BaseModel):
    submission_id: UUID
    student_id: str
    assignment_name: str
    score: int
    grade: str
    mistakes: list[MistakeItem]
    corrected_code: str
    explanation_en: str
    explanation_urdu: str
    suggestions: list[str]
    next_topics: list[str]
    breakdown: dict[str, int]
    processing_time_ms: int
    created_at: datetime


# ── DB models (SQLAlchemy, mirrors above) ───────────
class Student(BaseModel):
    id: UUID
    name: str
    email: str
    batch: str                    # e.g. "SMIT-Batch-42"
    created_at: datetime


class Rubric(BaseModel):
    id: str
    assignment_name: str
    language: str
    criteria: dict[str, int]      # criterion -> max points
    max_score: int
    created_by: str


# ── API response models ─────────────────────────────
class SubmitResponse(BaseModel):
    submission_id: str
    status: str
    poll_url: str


class SubmissionStatus(BaseModel):
    submission_id: str
    status: str


class HistoryItem(BaseModel):
    submission_id: str
    assignment_name: str
    language: str
    score: int | None
    grade: str | None
    status: str
    created_at: datetime


class HealthResponse(BaseModel):
    status: str
    version: str


class RubricCreate(BaseModel):
    name: str
    language: str
    criteria: dict[str, int]
    max_score: int
    created_by: str


class DashboardStats(BaseModel):
    batch: str
    total_students: int
    total_submissions: int
    average_score: float
    grade_distribution: dict[str, int]
