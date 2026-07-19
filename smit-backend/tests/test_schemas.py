import pytest
from uuid import uuid4
from datetime import datetime, timezone
from pydantic import ValidationError
from models.schemas import (
    MistakeItem, SubmissionInput, CodeReviewResult,
    TutorOutput, RubricScore, FeedbackOutput, AssignmentReport
)


# TC-001
def test_mistake_item_valid_syntax():
    item = MistakeItem(
        line=5, type="syntax",
        description="Missing semicolon",
        description_urdu="Semicolon nahi hai",
        corrected_snippet="const x = 1;"
    )
    assert item.type == "syntax"
    assert item.line == 5
    assert item.corrected_snippet == "const x = 1;"


# TC-002
def test_mistake_item_valid_all_types():
    for t in ["syntax", "logic", "naming", "structure", "style"]:
        item = MistakeItem(
            line=1, type=t,
            description="desc", description_urdu="urdu", corrected_snippet=None
        )
        assert item.type == t


# TC-003
def test_mistake_item_rejects_invalid_type():
    with pytest.raises(ValidationError) as exc:
        MistakeItem(
            line=1, type="unknown",
            description="x", description_urdu="x", corrected_snippet=None
        )
    assert "type" in str(exc.value).lower()


# TC-004
def test_mistake_item_line_can_be_none():
    item = MistakeItem(
        line=None, type="style",
        description="No line info",
        description_urdu="Line info nahi hai",
        corrected_snippet=None
    )
    assert item.line is None


# TC-005
def test_submission_input_valid_javascript():
    sub = SubmissionInput(
        student_id="s001",
        assignment_name="Week 1 JS",
        language="javascript",
        code="const x = 1;",
        rubric_id="rubric_js_w1"
    )
    assert sub.language == "javascript"
    assert sub.student_id == "s001"


# TC-006
def test_submission_input_valid_python():
    sub = SubmissionInput(
        student_id="s002",
        assignment_name="Week 2 Python",
        language="python",
        code="print('hello')",
        rubric_id="rubric_py_w2"
    )
    assert sub.language == "python"


# TC-007
def test_submission_input_rejects_invalid_language():
    with pytest.raises(ValidationError):
        SubmissionInput(
            student_id="s001",
            assignment_name="x",
            language="rust",
            code="fn main() {}",
            rubric_id="r1"
        )


# TC-008
def test_rubric_score_valid():
    r = RubricScore(
        score=78, grade="C",
        breakdown={"syntax": 20, "logic": 18, "style": 10}
    )
    assert r.score == 78
    assert r.grade == "C"
    assert r.breakdown["syntax"] == 20


# TC-009
def test_rubric_score_zero():
    r = RubricScore(score=0, grade="F", breakdown={})
    assert r.score == 0
    assert r.grade == "F"


# TC-010
def test_assignment_report_valid():
    report = AssignmentReport(
        submission_id=uuid4(),
        student_id="s001",
        assignment_name="Week 1 JS",
        score=85, grade="B",
        mistakes=[],
        corrected_code="const x = 1;",
        explanation_en="Good work.",
        explanation_urdu="Acha kaam.",
        suggestions=["Use const"],
        next_topics=["Functions"],
        breakdown={"syntax": 25, "logic": 30},
        processing_time_ms=3200,
        created_at=datetime.now(timezone.utc)
    )
    assert report.score == 85
    assert report.grade == "B"
    assert isinstance(report.mistakes, list)
    assert isinstance(report.breakdown, dict)
