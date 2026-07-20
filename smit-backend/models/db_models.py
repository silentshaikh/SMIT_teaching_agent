import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, JSON, UniqueConstraint, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ── Auth models ─────────────────────────────────────

class StudentModel(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(128))
    email: Mapped[str] = mapped_column(String(256), unique=True)
    password_hash: Mapped[str] = mapped_column(String(256), default="")
    batch: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    submissions = relationship("SubmissionModel", back_populates="student")


class TeacherModel(Base):
    __tablename__ = "teachers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(128))
    email: Mapped[str] = mapped_column(String(256), unique=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


# ── Course / assignment structure ───────────────────

class CourseModel(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(256))
    batch: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    assignments = relationship("AssignmentModel", back_populates="course")


class AssignmentModel(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"))
    name: Mapped[str] = mapped_column(String(256))
    rubric_id: Mapped[str] = mapped_column(String(36), ForeignKey("rubrics.id"), nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    course = relationship("CourseModel", back_populates="assignments")
    rubric = relationship("RubricModel")
    submissions = relationship("SubmissionModel", back_populates="assignment")


# ── Submission model (updated) ──────────────────────

class SubmissionModel(Base):
    __tablename__ = "submissions"
    __table_args__ = (
        Index("ix_submissions_student_id", "student_id"),
        Index("ix_submissions_assignment_id", "assignment_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id"))
    assignment_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("assignments.id"), nullable=True)
    rubric_version_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("rubric_versions.id"), nullable=True)
    file_name: Mapped[str] = mapped_column(String(256))
    language: Mapped[str] = mapped_column(String(32))
    source_code: Mapped[str] = mapped_column(Text, default="")
    code_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="pending")
    approval_status: Mapped[str] = mapped_column(String(16), default="pending")  # pending / approved / rejected
    reviewed_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    student = relationship("StudentModel", back_populates="submissions")
    assignment = relationship("AssignmentModel", back_populates="submissions")
    report = relationship("ReportModel", back_populates="submission", uselist=False)


# ── Report model (updated with override fields) ─────

class ReportModel(Base):
    __tablename__ = "reports"
    __table_args__ = (
        Index("ix_reports_submission_id", "submission_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id: Mapped[str] = mapped_column(String(36), ForeignKey("submissions.id"), unique=True)
    score: Mapped[int] = mapped_column(Integer)
    grade: Mapped[str] = mapped_column(String(4))
    report_json: Mapped[str] = mapped_column(Text)
    processing_ms: Mapped[int] = mapped_column(Integer)
    override_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    override_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    overridden_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    overridden_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    submission = relationship("SubmissionModel", back_populates="report")


# ── Rubric models (versioned) ───────────────────────

class RubricModel(Base):
    __tablename__ = "rubrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(256))
    language: Mapped[str] = mapped_column(String(32))
    criteria_json: Mapped[dict] = mapped_column(JSON)
    max_score: Mapped[int] = mapped_column(Integer)
    created_by: Mapped[str] = mapped_column(String(128))
    current_version_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    versions = relationship("RubricVersionModel", back_populates="rubric", order_by="RubricVersionModel.version_number.desc()")


class RubricVersionModel(Base):
    __tablename__ = "rubric_versions"
    __table_args__ = (UniqueConstraint("rubric_id", "version_number", name="uq_rubric_version"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rubric_id: Mapped[str] = mapped_column(String(36), ForeignKey("rubrics.id"))
    version_number: Mapped[int] = mapped_column(Integer)
    criteria_json: Mapped[dict] = mapped_column(JSON)
    max_score: Mapped[int] = mapped_column(Integer)
    created_by: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    rubric = relationship("RubricModel", back_populates="versions")


# ── Q&A model (persisted) ──────────────────────────

class QAModel(Base):
    __tablename__ = "qa_pairs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id: Mapped[str] = mapped_column(String(36), ForeignKey("submissions.id"), index=True)
    question: Mapped[str] = mapped_column(Text)
    answer_en: Mapped[str] = mapped_column(Text)
    answer_urdu: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
