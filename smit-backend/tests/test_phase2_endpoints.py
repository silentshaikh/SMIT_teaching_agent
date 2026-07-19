"""Tests for Phase 2 endpoints: analytics, override, bulk, PDF, rubric compare."""
import json
import io
import zipfile
import pytest
from unittest.mock import patch, AsyncMock
from uuid import uuid4
from datetime import datetime, timezone

from models.db_models import (
    SubmissionModel, ReportModel, StudentModel,
    RubricModel, RubricVersionModel,
)
from db.session import AsyncSessionLocal


def _seed_student(session, sid, email, batch="B1"):
    session.add(StudentModel(
        id=sid, name="T", email=email,
        password_hash="$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01",
        batch=batch,
    ))


def _seed_submission(session, sid, sub_id, student_id, rubric_version_id=None, status="completed"):
    session.add(SubmissionModel(
        id=sub_id, student_id=student_id, file_name="app.js",
        language="javascript", source_code="x=1", code_hash="h",
        status=status, rubric_version_id=rubric_version_id,
    ))


def _seed_report(session, sub_id, score=75, grade="C"):
    data = {
        "submission_id": sub_id, "score": score, "grade": grade,
        "mistakes": [{"id": "m1", "type": "logic", "line": 1, "description": "err", "corrected_snippet": "ok"}],
        "corrected_code": "ok", "explanation_en": "ok", "explanation_urdu": "ok",
        "suggestions": [], "next_topics": [], "breakdown": {},
        "processing_time_ms": 500, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    session.add(ReportModel(
        submission_id=sub_id, score=score, grade=grade,
        report_json=json.dumps(data), processing_ms=500,
    ))


# ── 2.1 Batch analytics ──────────────────────────────

def test_analytics_empty_batch(client):
    r = client.get("/api/v1/batches/empty-batch/analytics")
    assert r.status_code == 200
    data = r.json()
    assert data["total_submissions"] == 0
    assert data["average_score"] == 0.0
    assert data["mistake_stats"] == []


def test_analytics_with_data(client):
    uid = uuid4().hex[:8]
    sid = f"s-analytics-{uid}"
    sub_id = f"sub-analytics-{uid}"

    async def _seed():
        async with AsyncSessionLocal() as session:
            _seed_student(session, sid, f"analytics-{uid}@test.com", batch="B-ANALYTICS")
            _seed_submission(session, f"sub-analytics-{uid}", sub_id, sid)
            _seed_report(session, sub_id, score=80, grade="B")
            await session.commit()
    import asyncio
    asyncio.run(_seed())

    r = client.get("/api/v1/batches/B-ANALYTICS/analytics")
    assert r.status_code == 200
    data = r.json()
    assert data["total_submissions"] >= 1
    assert data["average_score"] > 0


def test_analytics_filter_by_assignment(client):
    uid = uuid4().hex[:8]
    sid = f"s-af-{uid}"
    sub_id = f"sub-af-{uid}"

    async def _seed():
        async with AsyncSessionLocal() as session:
            _seed_student(session, sid, f"af-{uid}@test.com", batch="B-AF")
            _seed_submission(session, f"sub-af-{uid}", sub_id, sid)
            _seed_report(session, sub_id, score=90, grade="A")
            await session.commit()
    import asyncio
    asyncio.run(_seed())

    r = client.get(f"/api/v1/batches/B-AF/analytics?assignment_id={sub_id}")
    assert r.status_code == 200


# ── 2.3 Override ──────────────────────────────────────

def test_override_returns_404_for_missing_report(client):
    r = client.patch("/api/v1/report/nonexistent/override", json={"new_score": 90, "teacher_note": "Fixed"})
    assert r.status_code == 404


def test_override_returns_403_for_student(client):
    uid = uuid4().hex[:8]
    sub_id = f"sub-ov-{uid}"

    async def _seed():
        async with AsyncSessionLocal() as session:
            _seed_student(session, f"s-ov-{uid}", f"ov-{uid}@test.com")
            _seed_submission(session, f"sub-ov-{uid}", sub_id, f"s-ov-{uid}")
            _seed_report(session, sub_id)
            await session.commit()
    import asyncio
    asyncio.run(_seed())

    import config as cfg
    original = cfg.settings.jwt_secret
    cfg.settings.jwt_secret = "override-test-secret"
    try:
        from api.routes.auth import create_token
        token = create_token("student1", "student", "s@test.com")
        r = client.patch(
            f"/api/v1/report/{sub_id}/override",
            json={"new_score": 95, "teacher_note": "Good"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 403
    finally:
        cfg.settings.jwt_secret = original


def test_override_bounds_rejects_negative_score(client):
    uid = uuid4().hex[:8]
    sub_id = f"sub-ov2-{uid}"

    async def _seed():
        async with AsyncSessionLocal() as session:
            _seed_student(session, f"s-ov2-{uid}", f"ov2-{uid}@test.com")
            _seed_submission(session, f"sub-ov2-{uid}", sub_id, f"s-ov2-{uid}")
            _seed_report(session, sub_id)
            await session.commit()
    import asyncio
    asyncio.run(_seed())

    r = client.patch(f"/api/v1/report/{sub_id}/override", json={"new_score": -5, "teacher_note": "No"})
    assert r.status_code == 422


def test_override_bounds_rejects_over_100(client):
    uid = uuid4().hex[:8]
    sub_id = f"sub-ov3-{uid}"

    async def _seed():
        async with AsyncSessionLocal() as session:
            _seed_student(session, f"s-ov3-{uid}", f"ov3-{uid}@test.com")
            _seed_submission(session, f"sub-ov3-{uid}", sub_id, f"s-ov3-{uid}")
            _seed_report(session, sub_id)
            await session.commit()
    import asyncio
    asyncio.run(_seed())

    r = client.patch(f"/api/v1/report/{sub_id}/override", json={"new_score": 101, "teacher_note": "No"})
    assert r.status_code == 422


# ── 2.4 Bulk submit ──────────────────────────────────

def test_bulk_submit_rejects_non_zip(client):
    r = client.post(
        "/api/v1/submit/bulk",
        files={"file": ("data.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 422


def test_bulk_submit_rejects_invalid_zip(client):
    r = client.post(
        "/api/v1/submit/bulk",
        files={"file": ("bad.zip", b"not-a-zip", "application/zip")},
    )
    assert r.status_code == 422


@patch("agents.orchestrator.process_submission")
def test_bulk_submit_valid_zip(mock_orch, client):
    mock_orch.return_value = AsyncMock()

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("student1_app.js", "const x = 1;")
        zf.writestr("student2_main.py", "x = 1")
    buf.seek(0)

    r = client.post(
        "/api/v1/submit/bulk",
        files={"file": ("submissions.zip", buf.read(), "application/zip")},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 2
    assert data["submitted"] == 2
    assert data["failed"] == 0


@patch("agents.orchestrator.process_submission")
def test_bulk_submit_skips_unsupported_files(mock_orch, client):
    mock_orch.return_value = AsyncMock()

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("student1_app.js", "const x = 1;")
        zf.writestr("student2_data.exe", b"MZ\x90\x00")
    buf.seek(0)

    r = client.post(
        "/api/v1/submit/bulk",
        files={"file": ("mix.zip", buf.read(), "application/zip")},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 2
    assert data["submitted"] == 1
    assert data["failed"] == 1


# ── 3.1 PDF report ───────────────────────────────────

def test_pdf_report_empty_batch(client):
    r = client.get("/api/v1/batches/empty-batch/report.pdf")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"


def test_pdf_report_with_data(client):
    uid = uuid4().hex[:8]
    sid = f"s-pdf-{uid}"
    sub_id = f"sub-pdf-{uid}"

    async def _seed():
        async with AsyncSessionLocal() as session:
            _seed_student(session, sid, f"pdf-{uid}@test.com", batch="B-PDF")
            _seed_submission(session, f"sub-pdf-{uid}", sub_id, sid)
            _seed_report(session, sub_id, score=88, grade="A")
            await session.commit()
    import asyncio
    asyncio.run(_seed())

    r = client.get("/api/v1/batches/B-PDF/report.pdf")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert len(r.content) > 100


# ── Rubric version compare ───────────────────────────

def test_compare_rubric_versions_empty(client):
    r = client.get(f"/api/v1/rubrics/{uuid4()}/compare")
    assert r.status_code == 200
    assert r.json() == []


def test_compare_rubric_versions(client):
    uid = uuid4().hex[:8]
    rubric_id = f"rubric-comp-{uid}"

    async def _seed():
        async with AsyncSessionLocal() as session:
            rubric = RubricModel(
                id=rubric_id, name="Test", language="python",
                criteria_json={"syntax": 50}, max_score=100, created_by="t",
            )
            session.add(rubric)
            v1 = RubricVersionModel(
                rubric_id=rubric_id, version_number=1,
                criteria_json={"syntax": 50}, max_score=100, created_by="t",
            )
            session.add(v1)
            v2 = RubricVersionModel(
                rubric_id=rubric_id, version_number=2,
                criteria_json={"syntax": 30, "logic": 70}, max_score=100, created_by="t",
            )
            session.add(v2)
            await session.flush()
            rubric.current_version_id = v1.id
            await session.commit()
    import asyncio
    asyncio.run(_seed())

    r = client.get(f"/api/v1/rubrics/{rubric_id}/compare")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert data[0]["version_number"] == 1
    assert data[1]["version_number"] == 2
