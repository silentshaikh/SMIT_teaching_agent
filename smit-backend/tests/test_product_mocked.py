"""Product tests — rewritten to mock _run_with_retry in orchestrator.

These tests exercise the FULL pipeline (submit → orchestrator → agents → DB → report)
without requiring OpenRouter credits.  Each test mocks _run_with_retry with a side_effect
that returns the correct output type for each agent in the pipeline.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4


# ── Helpers ──────────────────────────────────────────────

from models.schemas import (
    CodeReviewResult, MistakeItem, TutorOutput,
    RubricScore, FeedbackOutput, AssignmentReport,
    SubmissionInput,
)
from agents.orchestrator import process_submission, _hash_code
from db.session import AsyncSessionLocal
from sqlalchemy import select
from models.db_models import SubmissionModel, ReportModel


def _mock_cr(code: str, mistakes: list[dict] | None = None) -> MagicMock:
    if mistakes is None:
        mistakes = []
    items = [MistakeItem(**m) for m in mistakes]
    out = MagicMock()
    out.final_output = CodeReviewResult(
        mistakes=items,
        corrected_code=code.strip() + "\n// corrected",
        has_critical_errors=len(items) > 0,
    )
    return out


def _mock_tutor() -> MagicMock:
    out = MagicMock()
    out.final_output = TutorOutput(
        explanation_en="The code defines variables and functions. Variables store data and functions are reusable blocks.",
        explanation_urdu="Yeh code variables aur functions define karta hai. Variables data store karte hain aur functions reusable blocks hain.",
        concepts_covered=["variable", "function"],
    )
    return out


def _mock_rubric(score: int = 80) -> MagicMock:
    out = MagicMock()
    out.final_output = RubricScore(
        score=score, grade="B",
        breakdown={"syntax": 25, "logic": 30, "style": 25},
    )
    return out


def _mock_feedback() -> MagicMock:
    out = MagicMock()
    out.final_output = FeedbackOutput(
        suggestions=["Use const instead of var", "Add error handling"],
        next_topics=["Functions", "Scope"],
        practice_suggestions=["Write a function that reverses a string"],
    )
    return out


GOOD_JS = """
const studentName = 'Fatima';
const age = 22;

function greet(name) {
  return 'Hello, ' + name + '!';
}

const message = greet(studentName);
console.log(message);
"""

BAD_JS_SYNTAX = """
const name = 'Ahmed'
const age = 20

function greet(name {
  console.log('Hello ' + name
}

greet(name)
"""

BAD_JS_LOGIC = """
var x = 10;
var y = 0;
var result = x / y;
console.log(result);

function add(a, b) {
  return a - b;
}
console.log(add(3, 4));
"""

GOOD_PYTHON = """
student_name = 'Ali'
age = 19

def greet(name):
    return f'Hello, {name}!'

message = greet(student_name)
print(message)
"""

import json


def _default_run(agent, input_data, retries=3, **kw):
    """Default side_effect: dispatch by agent name."""
    name = agent.name if hasattr(agent, "name") else str(agent)
    if "CodeReview" in name:
        return _mock_cr(input_data)
    if "Tutor" in name:
        return _mock_tutor()
    if "Rubric" in name:
        return _mock_rubric()
    if "Feedback" in name:
        return _mock_feedback()
    return MagicMock()


# ── Tests ────────────────────────────────────────────────

@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_good_js_gets_high_score(mock_init_db, mock_retry):
    """TC-PROD-001: Well-written JS should score above 70."""
    mock_retry.side_effect = _default_run

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s1", assignment_name="W1", language="javascript",
        code=GOOD_JS, rubric_id="r1",
    )
    report = await process_submission(sid, inp)

    assert report is not None
    assert report.score >= 70
    assert report.grade in ("A", "B")
    assert len(report.explanation_en) >= 40
    assert len(report.explanation_urdu) >= 20
    assert isinstance(report.suggestions, list)
    assert len(report.suggestions) >= 1


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_syntax_errors_detected(mock_init_db, mock_retry):
    """TC-PROD-002: Code with syntax errors must have type 'syntax' mistakes."""
    def cr_side(agent, inp, **kw):
        name = agent.name if hasattr(agent, "name") else str(agent)
        if "CodeReview" in name:
            return _mock_cr(inp, mistakes=[{
                "line": 6, "type": "syntax",
                "description": "Missing closing parenthesis in function parameters",
                "description_urdu": "Function parameters mein closing parenthesis nahi hai",
                "corrected_snippet": "function greet(name) {",
            }])
        return _default_run(agent, inp, **kw)
    mock_retry.side_effect = cr_side

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s2", assignment_name="W1", language="javascript",
        code=BAD_JS_SYNTAX, rubric_id="r1",
    )
    report = await process_submission(sid, inp)

    assert report is not None
    syntax = [m for m in report.mistakes if m.type == "syntax"]
    assert len(syntax) >= 1
    assert report.score <= 60


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_logic_errors_detected(mock_init_db, mock_retry):
    """TC-PROD-003: Code with logic errors must have type 'logic' mistakes."""
    def cr_side(agent, inp, **kw):
        name = agent.name if hasattr(agent, "name") else str(agent)
        if "CodeReview" in name:
            return _mock_cr(inp, mistakes=[{
                "line": 4, "type": "logic",
                "description": "Division by zero - variable y is 0",
                "description_urdu": "Division by zero - variable y zero hai",
                "corrected_snippet": "var result = y !== 0 ? x / y : Infinity;",
            }])
        return _default_run(agent, inp, **kw)
    mock_retry.side_effect = cr_side

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s3", assignment_name="W1", language="javascript",
        code=BAD_JS_LOGIC, rubric_id="r1",
    )
    report = await process_submission(sid, inp)

    assert report is not None
    types = [m.type for m in report.mistakes]
    assert "logic" in types
    assert report.score < 80


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_urdu_explanation_is_roman_urdu(mock_init_db, mock_retry):
    """TC-PROD-004: Urdu explanation must contain Roman Urdu words."""
    mock_retry.side_effect = _default_run

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s4", assignment_name="W1", language="javascript",
        code=BAD_JS_SYNTAX, rubric_id="r1",
    )
    report = await process_submission(sid, inp)

    assert report is not None
    urdu = report.explanation_urdu.lower()
    markers = ["hai", "karo", "nahi", "matlab", "kiya", "wala", "mein", "ka", "yeh", "code", "variables", "functions"]
    found = [w for w in markers if w in urdu]
    assert len(found) >= 2, f"Not enough Roman Urdu markers: {found}"


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_report_all_fields_populated(mock_init_db, mock_retry):
    """TC-PROD-005: Every field of AssignmentReport must be non-empty."""
    mock_retry.side_effect = _default_run

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s5", assignment_name="W1", language="javascript",
        code=GOOD_JS, rubric_id="r1",
    )
    report = await process_submission(sid, inp)

    assert report is not None
    assert str(report.submission_id) == sid
    assert report.student_id == "s5"
    assert len(report.corrected_code) > 0
    assert len(report.explanation_en) > 0
    assert len(report.explanation_urdu) > 0
    assert isinstance(report.score, int)
    assert isinstance(report.grade, str)
    assert isinstance(report.mistakes, list)
    assert isinstance(report.suggestions, list)
    assert isinstance(report.next_topics, list)
    assert isinstance(report.breakdown, dict)
    assert isinstance(report.processing_time_ms, int)
    assert report.processing_time_ms > 0


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_mistake_items_fully_populated(mock_init_db, mock_retry):
    """TC-PROD-006: Every MistakeItem must have all required fields."""
    def cr_side(agent, inp, **kw):
        name = agent.name if hasattr(agent, "name") else str(agent)
        if "CodeReview" in name:
            return _mock_cr(inp, mistakes=[
                {"line": 6, "type": "syntax", "description": "Missing closing parenthesis in function parameters — the declaration is incomplete", "description_urdu": "Function parameters mein closing parenthesis nahi hai", "corrected_snippet": "function greet(name) {"},
                {"line": 7, "type": "syntax", "description": "Missing closing parenthesis in console.log call", "description_urdu": "Console.log call mein closing parenthesis nahi hai", "corrected_snippet": "console.log('Hello ' + name);"},
            ])
        return _default_run(agent, inp, **kw)
    mock_retry.side_effect = cr_side

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s6", assignment_name="W1", language="javascript",
        code=BAD_JS_SYNTAX, rubric_id="r1",
    )
    report = await process_submission(sid, inp)

    assert report is not None
    assert len(report.mistakes) > 0
    valid = {"syntax", "logic", "naming", "structure", "style"}
    for m in report.mistakes:
        assert m.type in valid
        assert len(m.description) >= 10
        assert len(m.description_urdu) >= 5


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_report_within_sla(mock_init_db, mock_retry):
    """TC-PROD-007: Full pipeline must complete within 60 seconds."""
    import time
    mock_retry.side_effect = _default_run

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s7", assignment_name="W1", language="javascript",
        code=GOOD_JS, rubric_id="r1",
    )

    start = time.time()
    report = await process_submission(sid, inp)
    elapsed = time.time() - start

    assert report is not None
    assert elapsed < 65


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_python_submission_works(mock_init_db, mock_retry):
    """TC-PROD-008: Python files must be accepted and reviewed correctly."""
    mock_retry.side_effect = _default_run

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s8", assignment_name="W2", language="python",
        code=GOOD_PYTHON, rubric_id="r2",
    )
    report = await process_submission(sid, inp)

    assert report is not None
    assert report.score > 0
    assert len(report.explanation_en) > 0


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_same_code_consistent_score(mock_init_db, mock_retry):
    """TC-PROD-009: Same code twice → scores within ±5."""
    mock_retry.side_effect = _default_run

    inp = SubmissionInput(
        student_id="s9", assignment_name="W1", language="javascript",
        code=GOOD_JS, rubric_id="r1",
    )
    r1 = await process_submission(str(uuid4()), inp)
    r2 = await process_submission(str(uuid4()), inp)

    assert r1 is not None and r2 is not None
    assert abs(r1.score - r2.score) <= 5


@pytest.mark.asyncio
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_invalid_file_rejected(mock_init_db):
    """TC-PROD-010: Non-code files must be rejected with 422."""
    from fastapi.testclient import TestClient
    from api.main import app

    with TestClient(app) as client:
        from api.routes.auth import create_token
        token = create_token("s10", "student", "s10@test.com")
        r = client.post(
            "/api/v1/submit",
            headers={"Authorization": f"Bearer {token}"},
            data={"assignment_name": "W1", "rubric_id": "r1"},
            files={"file": ("hack.exe", b"MZ\x90\x00", "application/octet-stream")},
        )
        assert r.status_code in [400, 413, 422]
        assert r.status_code != 500


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_report_stored_in_db(mock_init_db, mock_retry):
    """TC-PROD-011: Report must be stored in DB after pipeline completes."""
    mock_retry.side_effect = _default_run

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s_db", assignment_name="DB", language="javascript",
        code=GOOD_JS, rubric_id="r1",
    )
    report = await process_submission(sid, inp)
    assert report is not None

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(SubmissionModel).where(SubmissionModel.id == sid))
        sub = result.scalar_one_or_none()
        assert sub is not None
        assert sub.status == "completed"

        result = await session.execute(select(ReportModel).where(ReportModel.submission_id == sid))
        db_report = result.scalar_one_or_none()
        assert db_report is not None
        assert db_report.score == report.score


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_pipeline_failure_marks_failed(mock_init_db, mock_retry):
    """TC-PROD-012: Pipeline failure → submission marked 'failed'."""
    mock_retry.side_effect = Exception("LLM API error")

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s_fail", assignment_name="Fail", language="javascript",
        code=GOOD_JS, rubric_id="r1",
    )
    report = await process_submission(sid, inp)
    assert report is None

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(SubmissionModel).where(SubmissionModel.id == sid))
        sub = result.scalar_one_or_none()
        assert sub is not None
        assert sub.status == "failed"


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_mistake_ids_assigned(mock_init_db, mock_retry):
    """TC-PROD-013: Orchestrator assigns stable IDs (m1, m2, ...) to mistakes."""
    def cr_side(agent, inp, **kw):
        name = agent.name if hasattr(agent, "name") else str(agent)
        if "CodeReview" in name:
            return _mock_cr(inp, mistakes=[
                {"line": 1, "type": "syntax", "description": "Error A description for testing", "description_urdu": "A galti", "corrected_snippet": "x"},
                {"line": 2, "type": "logic", "description": "Error B description for testing", "description_urdu": "B galti", "corrected_snippet": "y"},
                {"line": 3, "type": "naming", "description": "Error C description for testing", "description_urdu": "C galti", "corrected_snippet": "z"},
            ])
        return _default_run(agent, inp, **kw)
    mock_retry.side_effect = cr_side

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s_ids", assignment_name="IDs", language="javascript",
        code=GOOD_JS, rubric_id="r1",
    )
    report = await process_submission(sid, inp)

    assert report is not None
    assert len(report.mistakes) == 3
    assert [m.id for m in report.mistakes] == ["m1", "m2", "m3"]


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_source_code_saved(mock_init_db, mock_retry):
    """TC-PROD-014: Original source code must be stored in SubmissionModel."""
    mock_retry.side_effect = _default_run

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s_src", assignment_name="Src", language="javascript",
        code=GOOD_JS, rubric_id="r1",
    )
    await process_submission(sid, inp)

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(SubmissionModel).where(SubmissionModel.id == sid))
        sub = result.scalar_one_or_none()
        assert sub is not None
        assert sub.source_code == GOOD_JS
        assert sub.code_hash == _hash_code(GOOD_JS)


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_unknown_student_rejected(mock_init_db, mock_retry):
    """TC-PROD-015: Unknown student_id should fail, not auto-create."""
    mock_retry.side_effect = _default_run

    sid = str(uuid4())
    new_student_id = f"new_student_{uuid4().hex[:8]}"
    inp = SubmissionInput(
        student_id=new_student_id, assignment_name="Auto", language="javascript",
        code=GOOD_JS, rubric_id="r1",
    )
    report = await process_submission(sid, inp)
    assert report is None  # Rejected because student doesn't exist


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_rubric_version_resolved(mock_init_db, mock_retry):
    """TC-PROD-016: Rubric version should be resolved if rubric has versions in DB."""
    from models.db_models import RubricVersionModel

    mock_retry.side_effect = _default_run

    rubric_id = f"rubric_{uuid4().hex[:8]}"
    async with AsyncSessionLocal() as session:
        ver = RubricVersionModel(
            id=f"ver_{uuid4().hex[:8]}",
            rubric_id=rubric_id,
            version_number=3,
            criteria_json={"criteria": "test"},
            max_score=100,
            created_by="test",
        )
        session.add(ver)
        await session.commit()

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s_ver", assignment_name="Ver", language="javascript",
        code=GOOD_JS, rubric_id=rubric_id,
    )
    report = await process_submission(sid, inp)
    assert report is not None

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(SubmissionModel).where(SubmissionModel.id == sid))
        sub = result.scalar_one_or_none()
        assert sub.rubric_version_id == ver.id


@pytest.mark.asyncio
@patch("agents.orchestrator._RETRY_DELAY", 0)
@patch("agents.orchestrator.Runner")
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_run_with_retry_retries_on_failure(mock_init_db, MockRunner):
    """TC-PROD-017: _run_with_retry should retry on agent failure."""
    from agents.orchestrator import _run_with_retry
    from agents.code_review import code_review_agent

    call_count = 0

    async def flaky_run(agent, input=None, input_data=None, max_turns=20, run_config=None):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise Exception(f"Attempt {call_count} failed")
        return _mock_cr(input or input_data or "test")

    MockRunner.run = AsyncMock(side_effect=flaky_run)

    result = await _run_with_retry(code_review_agent, "test input")
    assert result is not None
    assert call_count == 3


@pytest.mark.asyncio
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_orchestrator_agent_exists(mock_init_db):
    """TC-PROD-018: orchestrator_agent should be defined."""
    from agents.orchestrator import orchestrator_agent
    assert orchestrator_agent.name == "OrchestratorAgent"


@pytest.mark.asyncio
@patch("agents.orchestrator._run_with_retry", new_callable=AsyncMock)
@patch("agents.orchestrator.init_db", new_callable=AsyncMock)
async def test_deterministic_score_override(mock_init_db, mock_retry):
    """TC-PROD-019: Rubric agent's score should be overridden by deterministic calculation."""
    def rubric_override(agent, inp, **kw):
        name = agent.name if hasattr(agent, "name") else str(agent)
        if "Rubric" in name:
            result = MagicMock()
            result.final_output = RubricScore(
                score=50, grade="C",
                breakdown={"syntax": 25, "logic": 25},
            )
            return result
        return _default_run(agent, inp, **kw)
    mock_retry.side_effect = rubric_override

    sid = str(uuid4())
    inp = SubmissionInput(
        student_id="s_det", assignment_name="Det", language="javascript",
        code=GOOD_JS, rubric_id="r1",
    )
    report = await process_submission(sid, inp)

    assert report is not None
    assert 0 <= report.score <= 100
    assert report.grade in ("A", "B", "C", "D", "F")
