from pydantic import BaseModel, Field
from typing import Literal
from uuid import UUID
from datetime import datetime


# ── Core input ─────────────────────────────────────
class SubmissionInput(BaseModel):
    student_id: str = Field(max_length=128)
    assignment_id: str | None = Field(None, max_length=128)
    assignment_name: str = Field(max_length=256)
    language: Literal["javascript", "python", "html"]
    code: str                    # raw source code string
    rubric_id: str = Field(max_length=128)  # links to Qdrant rubric


# ── Agent output models ─────────────────────────────
class MistakeItem(BaseModel):
    id: str = ""
    line: int | None
    type: Literal["syntax", "logic", "naming", "structure", "style"]
    description: str = Field(max_length=2048)  # English explanation
    description_urdu: str = Field(max_length=2048)  # Roman Urdu explanation
    corrected_snippet: str | None = Field(None, max_length=4096)


class CodeReviewResult(BaseModel):
    mistakes: list[MistakeItem]
    corrected_code: str = Field(max_length=65536)
    has_critical_errors: bool


class TutorOutput(BaseModel):
    explanation_en: str = Field(max_length=4096)  # English walkthrough
    explanation_urdu: str = Field(max_length=4096)  # Roman Urdu walkthrough
    concepts_covered: list[str]


class RubricScore(BaseModel):
    score: int = Field(ge=0, le=100)  # 0–100
    grade: str = Field(max_length=2)  # A / B / C / D / F
    breakdown: dict[str, int]    # criterion -> points earned


class FeedbackOutput(BaseModel):
    suggestions: list[str]       # 3-5 personalized items
    next_topics: list[str]       # what to study next
    practice_suggestions: list[str] = []  # Phase 1.4


# ── Final unified report ────────────────────────────
class AssignmentReport(BaseModel):
    submission_id: UUID
    student_id: str = Field(max_length=128)
    assignment_name: str = Field(max_length=256)
    score: int = Field(ge=0, le=100)
    grade: str = Field(max_length=2)
    mistakes: list[MistakeItem]
    corrected_code: str = Field(max_length=65536)
    explanation_en: str = Field(max_length=4096)
    explanation_urdu: str = Field(max_length=4096)
    suggestions: list[str]
    next_topics: list[str]
    breakdown: dict[str, int]
    processing_time_ms: int
    created_at: datetime
    override_score: int | None = Field(None, ge=0, le=100)
    override_note: str | None = Field(None, max_length=1024)
    overridden_by: str | None = Field(None, max_length=128)
    overridden_at: datetime | None = None


# ── DB models (SQLAlchemy, mirrors above) ───────────
class Student(BaseModel):
    id: UUID
    name: str = Field(max_length=128)
    email: str = Field(max_length=256)
    batch: str = Field(max_length=64)  # e.g. "SMIT-Batch-42"
    created_at: datetime


class Teacher(BaseModel):
    id: str
    name: str = Field(max_length=128)
    email: str = Field(max_length=256)
    created_at: datetime


class Course(BaseModel):
    id: str
    name: str = Field(max_length=256)
    batch: str = Field(max_length=64)
    created_at: datetime


class Assignment(BaseModel):
    id: str
    course_id: str
    name: str = Field(max_length=256)
    rubric_id: str | None = Field(None, max_length=128)
    due_date: datetime | None
    created_at: datetime


class Rubric(BaseModel):
    id: str
    assignment_name: str = Field(max_length=256)
    language: str = Field(max_length=32)
    criteria: dict[str, int]      # criterion -> max points
    max_score: int
    created_by: str = Field(max_length=128)


class RubricVersion(BaseModel):
    id: str
    rubric_id: str
    version_number: int
    criteria: dict[str, int]
    max_score: int
    created_by: str = Field(max_length=128)
    created_at: datetime


# ── API response models ─────────────────────────────
class SubmitResponse(BaseModel):
    submission_id: str
    status: str = Field(max_length=32)
    poll_url: str = Field(max_length=256)


class SubmissionStatus(BaseModel):
    submission_id: str
    status: str = Field(max_length=32)


class HistoryItem(BaseModel):
    submission_id: str
    assignment_name: str = Field(max_length=256)
    language: str = Field(max_length=32)
    score: int | None
    grade: str | None = Field(None, max_length=2)
    status: str = Field(max_length=32)
    course_name: str | None = Field(None, max_length=256)
    created_at: datetime


class HealthResponse(BaseModel):
    status: str = Field(max_length=32)
    version: str = Field(max_length=32)


class RubricCreate(BaseModel):
    name: str = Field(max_length=256)
    language: str = Field(max_length=32)
    criteria: dict[str, int]
    max_score: int
    created_by: str = Field(max_length=128)


class CourseStats(BaseModel):
    course_id: str
    course_name: str = Field(max_length=256)
    total_submissions: int
    average_score: float


class DashboardStats(BaseModel):
    batch: str = Field(max_length=64)
    total_students: int
    total_submissions: int
    average_score: float
    grade_distribution: dict[str, int]
    courses: list[CourseStats] = []


class LoginRequest(BaseModel):
    email: str = Field(max_length=256)
    password: str = Field(max_length=128)
    role: Literal["student", "teacher"]


class RegisterRequest(BaseModel):
    email: str = Field(max_length=256)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=2, max_length=128)
    role: Literal["student", "teacher"]
    batch: str | None = Field(None, max_length=64)
    invite_code: str | None = Field(None, max_length=128)


class LoginResponse(BaseModel):
    token: str
    role: Literal["student", "teacher"]
    user_id: str
    name: str = Field(max_length=128)


# ── Phase 1 schemas ──────────────────────────────────
class ProgressPoint(BaseModel):
    submission_id: str
    created_at: datetime
    score: int | None
    grade: str | None = Field(None, max_length=2)


class MistakeFrequency(BaseModel):
    type: str = Field(max_length=32)
    count: int


class StudentProgress(BaseModel):
    student_id: str = Field(max_length=128)
    time_series: list[ProgressPoint]
    mistake_type_frequency: list[MistakeFrequency]


class QARequest(BaseModel):
    question: str = Field(max_length=1024)


class QAResponse(BaseModel):
    question: str = Field(max_length=1024)
    answer_en: str = Field(max_length=4096)
    answer_urdu: str = Field(max_length=4096)
    created_at: str


class ReverifyRequest(BaseModel):
    corrected_snippet: str = Field(max_length=4096)


class ReverifyResponse(BaseModel):
    passed: bool
    note: str = Field(max_length=1024)


class Badge(BaseModel):
    id: str = Field(max_length=64)
    name: str = Field(max_length=128)
    description: str = Field(max_length=256)
    earned: bool


# ── Phase 2 schemas ──────────────────────────────────
class BatchMistakeStat(BaseModel):
    type: str = Field(max_length=32)
    count: int
    percentage: float


class BatchAnalytics(BaseModel):
    batch: str = Field(max_length=64)
    total_submissions: int
    average_score: float
    mistake_stats: list[BatchMistakeStat]
    assignment_filter: str | None = Field(None, max_length=128)
    date_from: str | None = Field(None, max_length=32)
    date_to: str | None = Field(None, max_length=32)


class OverrideRequest(BaseModel):
    new_score: int = Field(ge=0, le=100)
    teacher_note: str = Field(max_length=1024)


class RubricVersionComparison(BaseModel):
    rubric_id: str
    versions: list[RubricVersion]


class BulkSubmitResult(BaseModel):
    total: int
    submitted: int
    failed: int
    results: list[dict]


# ── Submission approval schemas ──────────────────────
class SubmissionListItem(BaseModel):
    id: str
    student_id: str = Field(max_length=128)
    student_name: str | None = Field(None, max_length=128)
    assignment_name: str = Field(max_length=256)
    language: str = Field(max_length=32)
    file_name: str = Field(max_length=256)
    status: str = Field(max_length=32)
    approval_status: str = Field(max_length=16)
    reviewed_by: str | None = Field(None, max_length=128)
    reviewed_at: datetime | None = None
    score: int | None = None
    grade: str | None = Field(None, max_length=2)
    created_at: datetime


class ApprovalRequest(BaseModel):
    action: Literal["approved", "rejected"]
    note: str | None = Field(None, max_length=1024)


class ApprovalResponse(BaseModel):
    submission_id: str
    approval_status: str = Field(max_length=16)
    reviewed_by: str = Field(max_length=128)
    reviewed_at: datetime
