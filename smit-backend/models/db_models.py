import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class StudentModel(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(128))
    email: Mapped[str] = mapped_column(String(256))
    batch: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    submissions = relationship("SubmissionModel", back_populates="student")


class SubmissionModel(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id"))
    file_name: Mapped[str] = mapped_column(String(256))
    language: Mapped[str] = mapped_column(String(32))
    code_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    student = relationship("StudentModel", back_populates="submissions")
    report = relationship("ReportModel", back_populates="submission", uselist=False)


class ReportModel(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id: Mapped[str] = mapped_column(String(36), ForeignKey("submissions.id"), unique=True)
    score: Mapped[int] = mapped_column(Integer)
    grade: Mapped[str] = mapped_column(String(4))
    report_json: Mapped[str] = mapped_column(Text)
    processing_ms: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    submission = relationship("SubmissionModel", back_populates="report")


class RubricModel(Base):
    __tablename__ = "rubrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(256))
    language: Mapped[str] = mapped_column(String(32))
    criteria_json: Mapped[dict] = mapped_column(JSON)
    max_score: Mapped[int] = mapped_column(Integer)
    created_by: Mapped[str] = mapped_column(String(128))
