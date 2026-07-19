from pydantic import BaseModel, Field
from typing import Literal
from uuid import UUID
from datetime import datetime


# ── Core input ─────────────────────────────────────
class SubmissionInput(BaseModel):
    student_id: str
    assignment_id: str | None = None
    assignment_name: str
    language: Literal["javascript", "python", "html"]
    code: str                    # raw source code string
    rubric_id: str                # links to Qdrant rubric


# ── Agent output models ─────────────────────────────
class MistakeItem(BaseModel):
    id: str = ""
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
    practice_suggestions: list[str] = []  # Phase 1.4


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
    override_score: int | None = None
    override_note: str | None = None
    overridden_by: str | None = None
    overridden_at: datetime | None = None


# ── DB models (SQLAlchemy, mirrors above) ───────────
class Student(BaseModel):
    id: UUID
    name: str
    email: str
    batch: str                    # e.g. "SMIT-Batch-42"
    created_at: datetime


class Teacher(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime


class Course(BaseModel):
    id: str
    name: str
    batch: str
    created_at: datetime


class Assignment(BaseModel):
    id: str
    course_id: str
    name: str
    rubric_id: str | None
    due_date: datetime | None
    created_at: datetime


class Rubric(BaseModel):
    id: str
    assignment_name: str
    language: str
    criteria: dict[str, int]      # criterion -> max points
    max_score: int
    created_by: str


class RubricVersion(BaseModel):
    id: str
    rubric_id: str
    version_number: int
    criteria: dict[str, int]
    max_score: int
    created_by: str
    created_at: datetime


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
    course_name: str | None = None
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


class CourseStats(BaseModel):
    course_id: str
    course_name: str
    total_submissions: int
    average_score: float


class DashboardStats(BaseModel):
    batch: str
    total_students: int
    total_submissions: int
    average_score: float
    grade_distribution: dict[str, int]
    courses: list[CourseStats] = []


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    name: str = Field(min_length=2, max_length=128)
    role: Literal["student", "teacher"]
    batch: str | None = None


class LoginResponse(BaseModel):
    token: str
    role: Literal["student", "teacher"]
    user_id: str
    name: str


# ── Phase 1 schemas ──────────────────────────────────
class ProgressPoint(BaseModel):
    submission_id: str
    created_at: datetime
    score: int | None
    grade: str | None


class MistakeFrequency(BaseModel):
    type: str
    count: int


class StudentProgress(BaseModel):
    student_id: str
    time_series: list[ProgressPoint]
    mistake_type_frequency: list[MistakeFrequency]


class QARequest(BaseModel):
    question: str


class QAResponse(BaseModel):
    question: str
    answer_en: str
    answer_urdu: str
    created_at: str


class ReverifyRequest(BaseModel):
    corrected_snippet: str


class ReverifyResponse(BaseModel):
    passed: bool
    note: str


class Badge(BaseModel):
    id: str
    name: str
    description: str
    earned: bool


# ── Phase 2 schemas ──────────────────────────────────
class BatchMistakeStat(BaseModel):
    type: str
    count: int
    percentage: float


class BatchAnalytics(BaseModel):
    batch: str
    total_submissions: int
    average_score: float
    mistake_stats: list[BatchMistakeStat]
    assignment_filter: str | None = None
    date_from: str | None = None
    date_to: str | None = None


class OverrideRequest(BaseModel):
    new_score: int = Field(ge=0, le=100)
    teacher_note: str


class RubricVersionComparison(BaseModel):
    rubric_id: str
    versions: list[RubricVersion]


class BulkSubmitResult(BaseModel):
    total: int
    submitted: int
    failed: int
    results: list[dict]
