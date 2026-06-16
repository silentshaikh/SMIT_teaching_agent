"""Schema validation tests — section 10: zero schema errors."""
import uuid
from datetime import datetime

import pytest
from pydantic import ValidationError

from models.schemas import (
    SubmissionInput, MistakeItem, CodeReviewResult, TutorOutput,
    RubricScore, FeedbackOutput, AssignmentReport, Student, Rubric,
    SubmitResponse, HistoryItem, HealthResponse, RubricCreate, DashboardStats,
)


class TestSubmissionInput:
    def test_valid(self):
        s = SubmissionInput(student_id="s1", assignment_name="hw1", language="python", code="x=1", rubric_id="r1")
        assert s.student_id == "s1"

    def test_invalid_language(self):
        with pytest.raises(ValidationError):
            SubmissionInput(student_id="s1", assignment_name="hw1", language="rust", code="x=1", rubric_id="r1")


class TestMistakeItem:
    def test_valid(self):
        m = MistakeItem(line=5, type="syntax", description="bad", description_urdu="bura", corrected_snippet="x=1")
        assert m.line == 5

    def test_type_must_be_literal(self):
        with pytest.raises(ValidationError):
            MistakeItem(line=1, type="typo", description="x", description_urdu="y", corrected_snippet=None)


class TestCodeReviewResult:
    def test_valid(self):
        m = MistakeItem(line=1, type="syntax", description="missing colon", description_urdu="colon nahi hai", corrected_snippet="if x:")
        r = CodeReviewResult(mistakes=[m], corrected_code="if x:\n    pass", has_critical_errors=False)
        assert len(r.mistakes) == 1
        assert r.has_critical_errors is False

    def test_empty_mistakes(self):
        r = CodeReviewResult(mistakes=[], corrected_code="pass", has_critical_errors=False)
        assert r.mistakes == []


class TestTutorOutput:
    def test_valid(self):
        t = TutorOutput(explanation_en="good", explanation_urdu="acha", concepts_covered=["loop"])
        assert t.concepts_covered == ["loop"]


class TestRubricScore:
    def test_valid(self):
        r = RubricScore(score=85, grade="B", breakdown={"logic": 40, "style": 45})
        assert r.score == 85

    def test_score_out_of_range_passes(self):
        r = RubricScore(score=-5, grade="F", breakdown={"x": 0})
        assert r.score == -5


class TestFeedbackOutput:
    def test_valid(self):
        f = FeedbackOutput(suggestions=["practice loops"], next_topics=["functions"])
        assert len(f.suggestions) == 1


class TestAssignmentReport:
    def test_valid(self):
        uid = uuid.uuid4()
        now = datetime.utcnow()
        m = MistakeItem(line=1, type="syntax", description="err", description_urdu="ghalti", corrected_snippet=None)
        r = AssignmentReport(
            submission_id=uid, student_id="s1", assignment_name="hw1",
            score=90, grade="A", mistakes=[m], corrected_code="ok",
            explanation_en="good", explanation_urdu="acha",
            suggestions=["study"], next_topics=["loops"],
            breakdown={"x": 90}, processing_time_ms=100, created_at=now,
        )
        assert r.submission_id == uid
        assert r.score == 90

    def test_all_fields_present(self):
        uid = uuid.uuid4()
        now = datetime.utcnow()
        m = MistakeItem(line=1, type="logic", description="x", description_urdu="y", corrected_snippet="z")
        r = AssignmentReport(
            submission_id=uid, student_id="s1", assignment_name="hw1",
            score=75, grade="C", mistakes=[m], corrected_code="fixed",
            explanation_en="en", explanation_urdu="ur",
            suggestions=["a"], next_topics=["b"],
            breakdown={"c": 75}, processing_time_ms=200, created_at=now,
        )
        d = r.model_dump()
        assert all(k in d for k in [
            "submission_id", "student_id", "assignment_name", "score", "grade",
            "mistakes", "corrected_code", "explanation_en", "explanation_urdu",
            "suggestions", "next_topics", "breakdown", "processing_time_ms", "created_at",
        ])


class TestStudent:
    def test_valid(self):
        s = Student(id=uuid.uuid4(), name="Ali", email="ali@smit.edu", batch="SMIT-Batch-42", created_at=datetime.utcnow())
        assert s.batch == "SMIT-Batch-42"


class TestRubricModel:
    def test_valid(self):
        r = Rubric(id="r1", assignment_name="hw1", language="python", criteria={"logic": 50}, max_score=100, created_by="teacher")
        assert r.assignment_name == "hw1"


class TestApiResponses:
    def test_submit_response(self):
        r = SubmitResponse(submission_id="abc", status="processing", poll_url="/api/v1/report/abc")
        assert r.poll_url.endswith("abc")

    def test_health_response(self):
        r = HealthResponse(status="ok", version="1.0.0")
        assert r.status == "ok"

    def test_history_item(self):
        r = HistoryItem(submission_id="s1", assignment_name="hw1", language="python", score=85, grade="B", status="completed", created_at=datetime.utcnow())
        assert r.score == 85

    def test_rubric_create(self):
        r = RubricCreate(name="hw1", language="python", criteria={"x": 50}, max_score=100, created_by="teacher")
        assert r.name == "hw1"

    def test_dashboard_stats(self):
        r = DashboardStats(batch="B42", total_students=30, total_submissions=60, average_score=72.5, grade_distribution={"A": 5, "B": 10})
        assert r.average_score == 72.5
