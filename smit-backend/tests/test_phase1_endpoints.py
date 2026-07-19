"""Tests for Phase 1 endpoints: progress, Q&A, reverify, badges."""
import json
import pytest
from unittest.mock import patch, AsyncMock
from uuid import uuid4
from datetime import datetime, timezone

from models.db_models import SubmissionModel, ReportModel, StudentModel
from db.session import AsyncSessionLocal
from api.routes.auth import hash_password


def _seed_student(session, student_id, email, batch="B1"):
    student = StudentModel(
        id=student_id, name="Test", email=email,
        password_hash=hash_password("pass"), batch=batch,
    )
    session.add(student)
    return student


def _seed_submission(session, student_id, sub_id, status="completed"):
    sub = SubmissionModel(
        id=sub_id, student_id=student_id, file_name="app.js",
        language="javascript", source_code="const x=1;",
        code_hash="abc", status=status,
    )
    session.add(sub)
    return sub


def _seed_report(session, sub_id, score=80, grade="B", mistakes=None):
    if mistakes is None:
        mistakes = [{"id": "m1", "type": "syntax", "line": 1, "description": "Missing semicolon", "corrected_snippet": "const x = 1;"}]
    report_data = {
        "submission_id": sub_id, "student_id": "s1", "assignment_name": "HW1",
        "score": score, "grade": grade, "mistakes": mistakes,
        "corrected_code": "const x = 1;", "explanation_en": "Good", "explanation_urdu": "Acha",
        "suggestions": [], "next_topics": [], "breakdown": {"syntax": 30, "logic": 30, "style": 20},
        "processing_time_ms": 1000, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    rep = ReportModel(
        submission_id=sub_id, score=score, grade=grade,
        report_json=json.dumps(report_data), processing_ms=1000,
    )
    session.add(rep)
    return rep


# ── 1.1 Progress ──────────────────────────────────────

def test_progress_returns_empty_for_unknown_student(client):
    r = client.get("/api/v1/students/unknown-student/progress")
    assert r.status_code == 200
    data = r.json()
    assert data["student_id"] == "unknown-student"
    assert data["time_series"] == []
    assert data["mistake_type_frequency"] == []


def test_progress_returns_completed_submissions(client):
    uid = uuid4().hex[:8]
    sid = f"s-prog-{uid}"
    sub_id = f"sub-prog-{uid}"

    async def _seed():
        async with AsyncSessionLocal() as session:
            _seed_student(session, sid, f"prog-{uid}@test.com")
            sub = _seed_submission(session, sid, sub_id)
            _seed_report(session, sub_id, score=85, grade="B",
                         mistakes=[{"id": "m1", "type": "syntax", "line": 1, "description": "x", "corrected_snippet": "y"}])
            await session.commit()
    import asyncio
    asyncio.run(_seed())

    r = client.get(f"/api/v1/students/{sid}/progress")
    assert r.status_code == 200
    data = r.json()
    assert len(data["time_series"]) == 1
    assert data["time_series"][0]["score"] == 85
    assert data["time_series"][0]["submission_id"] == sub_id


def test_progress_mistake_frequency(client):
    uid = uuid4().hex[:8]
    sid = f"s-mf-{uid}"
    sub_id = f"sub-mf-{uid}"

    async def _seed():
        async with AsyncSessionLocal() as session:
            _seed_student(session, sid, f"mf-{uid}@test.com")
            _seed_submission(session, sid, sub_id)
            _seed_report(session, sub_id, mistakes=[
                {"id": "m1", "type": "syntax", "line": 1, "description": "a", "corrected_snippet": "b"},
                {"id": "m2", "type": "logic", "line": 2, "description": "c", "corrected_snippet": "d"},
                {"id": "m3", "type": "syntax", "line": 3, "description": "e", "corrected_snippet": "f"},
            ])
            await session.commit()
    import asyncio
    asyncio.run(_seed())

    r = client.get(f"/api/v1/students/{sid}/progress")
    freq = r.json()["mistake_type_frequency"]
    types = {f["type"]: f["count"] for f in freq}
    assert types["syntax"] == 2
    assert types["logic"] == 1


# ── 1.2 Q&A ──────────────────────────────────────────

def test_ask_question_returns_404_for_missing_report(client):
    r = client.post("/api/v1/report/nonexistent/ask", json={"question": "Why?"})
    assert r.status_code == 404


def test_get_qa_history_empty(client):
    r = client.get("/api/v1/report/nonexistent/qa")
    assert r.status_code == 200
    assert r.json() == []


@patch("agents.Runner.run")
def test_ask_question_calls_tutor_agent(mock_run, client):
    uid = uuid4().hex[:8]
    sub_id = f"sub-qa-{uid}"

    async def _seed():
        async with AsyncSessionLocal() as session:
            _seed_student(session, f"s-qa-{uid}", f"qa-{uid}@test.com")
            _seed_submission(session, f"s-qa-{uid}", sub_id)
            _seed_report(session, sub_id)
            await session.commit()
    import asyncio
    asyncio.run(_seed())

    mock_output = AsyncMock()
    mock_output.explanation_en = "Because X"
    mock_output.explanation_urdu = "Chunkay X"
    mock_result = AsyncMock()
    mock_result.final_output = mock_output
    mock_run.return_value = mock_result

    r = client.post(f"/api/v1/report/{sub_id}/ask", json={"question": "Why?"})
    assert r.status_code == 200
    data = r.json()
    assert "question" in data
    assert "answer_en" in data
    assert data["answer_en"] == "Because X"


# ── 1.3 Reverify ─────────────────────────────────────

def test_reverify_returns_404_for_unknown_mistake(client):
    r = client.post("/api/v1/mistakes/nonexistent/reverify", json={"corrected_snippet": "code"})
    assert r.status_code == 404


@patch("agents.Runner.run")
def test_reverify_returns_passed_true(mock_run, client):
    uid = uuid4().hex[:8]
    sub_id = f"sub-rev-{uid}"

    async def _seed():
        async with AsyncSessionLocal() as session:
            _seed_student(session, f"s-rev-{uid}", f"rev-{uid}@test.com")
            _seed_submission(session, f"s-rev-{uid}", sub_id)
            _seed_report(session, sub_id, mistakes=[
                {"id": "m-fix-1", "type": "syntax", "line": 1, "description": "Missing semicolon", "corrected_snippet": "const x = 1;"},
            ])
            await session.commit()
    import asyncio
    asyncio.run(_seed())

    mock_cr = AsyncMock()
    mock_cr.mistakes = []
    mock_result = AsyncMock()
    mock_result.final_output = mock_cr
    mock_run.return_value = mock_result

    r = client.post("/api/v1/mistakes/m-fix-1/reverify", json={"corrected_snippet": "const x = 1;"})
    assert r.status_code == 200
    assert r.json()["passed"] is True


# ── 1.5 Badges ───────────────────────────────────────

def test_badges_empty_student(client):
    r = client.get("/api/v1/students/unknown/badges")
    assert r.status_code == 200
    badges = r.json()
    assert len(badges) == 6
    assert all(b["earned"] is False for b in badges)


def test_badges_first_submission(client):
    uid = uuid4().hex[:8]
    sid = f"s-badge-{uid}"
    sub_id = f"sub-badge-{uid}"

    async def _seed():
        async with AsyncSessionLocal() as session:
            _seed_student(session, sid, f"badge-{uid}@test.com")
            _seed_submission(session, sid, sub_id)
            _seed_report(session, sub_id, score=90, grade="A")
            await session.commit()
    import asyncio
    asyncio.run(_seed())

    r = client.get(f"/api/v1/students/{sid}/badges")
    badges = {b["id"]: b["earned"] for b in r.json()}
    assert badges["first-submission"] is True
    assert badges["five-submissions"] is False
    assert badges["ten-submissions"] is False
