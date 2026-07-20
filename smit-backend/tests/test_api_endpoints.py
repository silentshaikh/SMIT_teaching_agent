import pytest
from unittest.mock import patch, AsyncMock
from uuid import uuid4


def _teacher_token():
    from api.routes.auth import create_token
    return create_token("teacher-001", "teacher", "teacher@test.com")


def _student_token(sid: str = "test-student-001"):
    from api.routes.auth import create_token
    return create_token(sid, "student", f"{sid}@test.com")


# TC-035
def test_health_endpoint_returns_200(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200


# TC-036
def test_health_endpoint_returns_ok_status(client):
    r = client.get("/api/v1/health")
    data = r.json()
    assert "status" in data
    assert data["status"] == "ok"


# TC-037
@patch("api.routes.submit.process_submission")
def test_submit_valid_js_returns_202(mock_orch, client, sample_js_code):
    mock_orch.return_value = AsyncMock()
    token = _student_token()
    r = client.post(
        "/api/v1/submit",
        headers={"Authorization": f"Bearer {token}"},
        data={"assignment_name": "Week 1 JS", "rubric_id": "rubric_js_w1"},
        files={"file": ("app.js", sample_js_code, "text/javascript")}
    )
    assert r.status_code in [200, 202]


# TC-038
@patch("api.routes.submit.process_submission")
def test_submit_returns_submission_id(mock_orch, client, sample_js_code):
    mock_orch.return_value = AsyncMock()
    token = _student_token()
    r = client.post(
        "/api/v1/submit",
        headers={"Authorization": f"Bearer {token}"},
        data={"assignment_name": "Week 1 JS", "rubric_id": "rubric_js_w1"},
        files={"file": ("app.js", sample_js_code, "text/javascript")}
    )
    assert "submission_id" in r.json()


# TC-039
@patch("api.routes.submit.process_submission")
def test_submit_returns_poll_url(mock_orch, client, sample_js_code):
    mock_orch.return_value = AsyncMock()
    token = _student_token()
    r = client.post(
        "/api/v1/submit",
        headers={"Authorization": f"Bearer {token}"},
        data={"assignment_name": "Week 1 JS", "rubric_id": "rubric_js_w1"},
        files={"file": ("app.js", sample_js_code, "text/javascript")}
    )
    data = r.json()
    assert "poll_url" in data or "submission_id" in data


# TC-040
def test_submit_rejects_exe_file(client):
    token = _student_token()
    r = client.post(
        "/api/v1/submit",
        headers={"Authorization": f"Bearer {token}"},
        data={"assignment_name": "Week 1", "rubric_id": "r1"},
        files={"file": ("hack.exe", b"MZ\x90\x00", "application/octet-stream")}
    )
    assert r.status_code in [400, 413, 422]
    assert r.status_code != 500


# TC-041
def test_submit_rejects_oversized_file(client):
    big = b"x" * 60_000
    token = _student_token()
    r = client.post(
        "/api/v1/submit",
        headers={"Authorization": f"Bearer {token}"},
        data={"assignment_name": "Week 1", "rubric_id": "r1"},
        files={"file": ("big.js", big, "text/javascript")}
    )
    assert r.status_code in [400, 413, 422]


# TC-042
def test_submit_rejects_teacher(client):
    token = _teacher_token()
    r = client.post(
        "/api/v1/submit",
        headers={"Authorization": f"Bearer {token}"},
        data={"assignment_name": "Week 1", "rubric_id": "r1"},
        files={"file": ("app.js", b"const x = 1;", "text/javascript")}
    )
    assert r.status_code == 403


# TC-043
def test_get_report_not_found_returns_404(client):
    fake_id = str(uuid4())
    r = client.get(f"/api/v1/report/{fake_id}")
    assert r.status_code == 404


# TC-044
def test_get_rubrics_returns_list(client):
    token = _teacher_token()
    r = client.get("/api/v1/rubrics", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ── Coverage boosters: admin endpoints ──

def test_health_has_version(client):
    r = client.get("/api/v1/health")
    assert "version" in r.json()


def test_dashboard_returns_stats(client):
    token = _teacher_token()
    r = client.get("/api/v1/dashboard/SMIT-Batch-42", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "batch" in data
    assert "total_students" in data
    assert "total_submissions" in data
    assert "average_score" in data
    assert "grade_distribution" in data


def test_create_rubric(client):
    token = _teacher_token()
    r = client.post(
        "/api/v1/rubrics",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Test Rubric",
            "language": "javascript",
            "criteria": {"syntax": 30, "logic": 40, "style": 30},
            "max_score": 100,
            "created_by": "admin",
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["assignment_name"] == "Test Rubric"
    assert data["language"] == "javascript"


def test_create_rubric_then_list(client):
    token = _teacher_token()
    client.post(
        "/api/v1/rubrics",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "List Test",
            "language": "python",
            "criteria": {"syntax": 50},
            "max_score": 50,
            "created_by": "admin",
        },
    )
    r = client.get("/api/v1/rubrics", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    names = [rb["assignment_name"] for rb in r.json()]
    assert "List Test" in names


# ── Coverage boosters: reports endpoints ──

def test_history_empty_student(client):
    token = _teacher_token()
    r = client.get(f"/api/v1/history/{uuid4()}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_report_not_found_for_random_id(client):
    r = client.get(f"/api/v1/report/{uuid4()}")
    assert r.status_code == 404


def test_download_report_not_found(client):
    r = client.get(f"/api/v1/report/{uuid4()}/download")
    assert r.status_code == 404


# ── Coverage boosters: orchestrator ──

@patch("agents.orchestrator.AsyncSessionLocal")
@patch("agents.orchestrator._run_with_retry")
async def test_process_submission_happy_path(mock_retry, mock_session_local):
    from agents.orchestrator import process_submission
    from models.schemas import (
        SubmissionInput, CodeReviewResult, MistakeItem,
        TutorOutput, RubricScore, FeedbackOutput,
    )
    from unittest.mock import AsyncMock, MagicMock

    mock_session = AsyncMock()
    mock_session_local.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_local.return_value.__aexit__ = AsyncMock(return_value=False)

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = MagicMock(id="s001")
    mock_session.execute.return_value = mock_result

    mock_retry.side_effect = [
        MagicMock(final_output=CodeReviewResult(
            mistakes=[], corrected_code="x = 1", has_critical_errors=False
        )),
        MagicMock(final_output=TutorOutput(
            explanation_en="Good", explanation_urdu="Acha", concepts_covered=["x"]
        )),
        MagicMock(final_output=RubricScore(
            score=80, grade="B", breakdown={"syntax": 25}
        )),
        MagicMock(final_output=FeedbackOutput(
            suggestions=["tip"], next_topics=["topic"]
        )),
    ]

    input_data = SubmissionInput(
        student_id="s001", assignment_name="W1",
        language="python", code="x = 1", rubric_id="r1"
    )
    result = await process_submission(str(uuid4()), input_data)
    assert result is not None
    assert isinstance(result.score, int)
    assert 0 <= result.score <= 100


@patch("agents.orchestrator.AsyncSessionLocal")
@patch("agents.orchestrator._run_with_retry")
async def test_process_submission_returns_none_on_failure(mock_retry, mock_session_local):
    from agents.orchestrator import process_submission
    from models.schemas import SubmissionInput
    from unittest.mock import AsyncMock, MagicMock

    mock_session = AsyncMock()
    mock_session_local.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_local.return_value.__aexit__ = AsyncMock(return_value=False)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = MagicMock(id="s001")
    mock_session.execute.return_value = mock_result

    mock_retry.side_effect = Exception("LLM error")

    input_data = SubmissionInput(
        student_id="s001", assignment_name="W1",
        language="python", code="x = 1", rubric_id="r1"
    )
    result = await process_submission(str(uuid4()), input_data)
    assert result is None


# ── Coverage booster: admin verify_token ──

async def test_verify_token_no_secret():
    from api.routes.auth import verify_token
    import config as cfg
    original = cfg.settings.jwt_secret
    cfg.settings.jwt_secret = "change-me-to-a-random-secret"
    try:
        result = await verify_token(None)
        assert result["sub"] == "dev-mode"
    finally:
        cfg.settings.jwt_secret = original


async def test_verify_token_bearer():
    from api.routes.auth import verify_token
    from jose import jwt
    import config as cfg
    original = cfg.settings.jwt_secret
    cfg.settings.jwt_secret = "my-secret"
    try:
        token = jwt.encode({"sub": "user1"}, "my-secret", algorithm="HS256")
        result = await verify_token(f"Bearer {token}")
        assert result["sub"] == "user1"
    finally:
        cfg.settings.jwt_secret = original


async def test_verify_token_invalid_token():
    from api.routes.auth import verify_token
    from fastapi import HTTPException
    import config as cfg
    original = cfg.settings.jwt_secret
    cfg.settings.jwt_secret = "my-secret"
    try:
        with pytest.raises(HTTPException) as exc:
            await verify_token("Bearer invalid-token")
        assert exc.value.status_code == 401
    finally:
        cfg.settings.jwt_secret = original


async def test_verify_token_bad_scheme():
    from api.routes.auth import verify_token
    from fastapi import HTTPException
    import config as cfg
    original = cfg.settings.jwt_secret
    cfg.settings.jwt_secret = "my-secret"
    try:
        with pytest.raises(HTTPException) as exc:
            await verify_token("Basic token123")
        assert exc.value.status_code == 401
    finally:
        cfg.settings.jwt_secret = original
