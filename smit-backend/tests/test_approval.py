"""Tests for submission approval workflow (teacher approve/reject)."""
import pytest
from uuid import uuid4
from datetime import datetime, timezone

from models.db_models import StudentModel, SubmissionModel, ReportModel
from db.session import AsyncSessionLocal


# ── Helpers ──────────────────────────────────────────

def _create_test_data():
    """Create a student, submission, and report. Returns (student_id, submission_id)."""
    uid = uuid4().hex[:8]
    student_id = f"approval-student-{uid}"
    submission_id = f"approval-sub-{uid}"
    teacher_id = f"approval-teacher-{uid}"

    async def _setup():
        async with AsyncSessionLocal() as session:
            student = StudentModel(
                id=student_id,
                name="Approval Test Student",
                email=f"approval-{uid}@test.com",
                password_hash="",
                batch="SMIT-Batch-42",
            )
            session.add(student)
            submission = SubmissionModel(
                id=submission_id,
                student_id=student_id,
                file_name="test.py",
                language="python",
                source_code="print('hello')",
                code_hash="abc123",
                status="completed",
                approval_status="pending",
            )
            session.add(submission)
            report = ReportModel(
                id=f"report-{uid}",
                submission_id=submission_id,
                score=85,
                grade="B",
                report_json='{"mistakes":[]}',
                processing_ms=100,
            )
            session.add(report)
            await session.commit()
    import asyncio
    asyncio.run(_setup())
    return student_id, submission_id, teacher_id


def _login_teacher(client, teacher_id):
    """Login as teacher and return auth headers."""
    from api.routes.auth import hash_password
    from models.db_models import TeacherModel

    uid = uuid4().hex[:8]
    email = f"approval-teacher-{uid}@test.com"

    async def _create():
        async with AsyncSessionLocal() as session:
            teacher = TeacherModel(
                id=teacher_id,
                name="Approval Teacher",
                email=email,
                password_hash=hash_password("pass123"),
            )
            session.add(teacher)
            await session.commit()
    import asyncio
    asyncio.run(_create())

    resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "pass123",
        "role": "teacher",
    })
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['token']}"}


# ── Tests ────────────────────────────────────────────

@pytest.fixture(autouse=True)
def setup_data():
    student_id, submission_id, teacher_id = _create_test_data()
    yield student_id, submission_id, teacher_id


def test_list_submissions_requires_teacher(client, setup_data):
    """TC-APR-001: Student cannot list all submissions."""
    student_id, submission_id, teacher_id = setup_data

    from api.routes.auth import hash_password
    from models.db_models import StudentModel

    uid = uuid4().hex[:8]
    async def _create():
        async with AsyncSessionLocal() as session:
            s = StudentModel(
                id=f"std-{uid}", name="S", email=f"s-{uid}@t.com",
                password_hash=hash_password("pass123"), batch="SMIT-Batch-42",
            )
            session.add(s)
            await session.commit()
    import asyncio
    asyncio.run(_create())

    resp = client.post("/api/v1/auth/login", json={
        "email": f"s-{uid}@t.com", "password": "pass123", "role": "student",
    })
    headers = {"Authorization": f"Bearer {resp.json()['token']}"}

    resp = client.get("/api/v1/submissions", headers=headers)
    assert resp.status_code == 403


def test_list_submissions_empty(client, setup_data):
    """TC-APR-002: Teacher can list submissions (empty if none match)."""
    _, _, teacher_id = setup_data
    headers = _login_teacher(client, teacher_id)

    resp = client.get("/api/v1/submissions", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_list_submissions_returns_data(client, setup_data):
    """TC-APR-003: Teacher list includes the created submission."""
    _, submission_id, teacher_id = setup_data
    headers = _login_teacher(client, teacher_id)

    resp = client.get("/api/v1/submissions", headers=headers)
    assert resp.status_code == 200
    items = resp.json()
    ids = [i["id"] for i in items]
    assert submission_id in ids


def test_approve_submission(client, setup_data):
    """TC-APR-004: Teacher can approve a submission."""
    _, submission_id, teacher_id = setup_data
    headers = _login_teacher(client, teacher_id)

    resp = client.patch(
        f"/api/v1/submissions/{submission_id}/approve",
        json={"action": "approved"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["approval_status"] == "approved"
    assert data["submission_id"] == submission_id


def test_reject_submission(client, setup_data):
    """TC-APR-005: Teacher can reject a submission."""
    _, submission_id, teacher_id = setup_data
    headers = _login_teacher(client, teacher_id)

    resp = client.patch(
        f"/api/v1/submissions/{submission_id}/approve",
        json={"action": "rejected", "note": "Code quality too low"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["approval_status"] == "rejected"


def test_reject_without_note(client, setup_data):
    """TC-APR-006: Rejection without note still works."""
    _, submission_id, teacher_id = setup_data
    headers = _login_teacher(client, teacher_id)

    resp = client.patch(
        f"/api/v1/submissions/{submission_id}/approve",
        json={"action": "rejected"},
        headers=headers,
    )
    assert resp.status_code == 200


def test_approve_nonexistent(client, setup_data):
    """TC-APR-007: Approving nonexistent submission returns 404."""
    _, _, teacher_id = setup_data
    headers = _login_teacher(client, teacher_id)

    resp = client.patch(
        "/api/v1/submissions/fake-id/approve",
        json={"action": "approved"},
        headers=headers,
    )
    assert resp.status_code == 404


def test_student_cannot_approve(client, setup_data):
    """TC-APR-008: Student cannot approve submissions."""
    student_id, submission_id, _ = setup_data

    from api.routes.auth import hash_password
    uid = uuid4().hex[:8]

    async def _create():
        async with AsyncSessionLocal() as session:
            s = StudentModel(
                id=f"std-{uid}", name="S", email=f"s-{uid}@t.com",
                password_hash=hash_password("pass123"), batch="SMIT-Batch-42",
            )
            session.add(s)
            await session.commit()
    import asyncio
    asyncio.run(_create())

    resp = client.post("/api/v1/auth/login", json={
        "email": f"s-{uid}@t.com", "password": "pass123", "role": "student",
    })
    headers = {"Authorization": f"Bearer {resp.json()['token']}"}

    resp = client.patch(
        f"/api/v1/submissions/{submission_id}/approve",
        json={"action": "approved"},
        headers=headers,
    )
    assert resp.status_code == 403


def test_filter_by_approval_status(client, setup_data):
    """TC-APR-009: Filter submissions by approval_status."""
    _, submission_id, teacher_id = setup_data
    headers = _login_teacher(client, teacher_id)

    # First approve it
    client.patch(
        f"/api/v1/submissions/{submission_id}/approve",
        json={"action": "approved"},
        headers=headers,
    )

    # Filter by approved — our submission should appear
    resp = client.get("/api/v1/submissions?approval_status=approved", headers=headers)
    assert resp.status_code == 200
    items = resp.json()
    ids = [i["id"] for i in items]
    assert submission_id in ids

    # Filter by pending — our submission should NOT appear (it's now approved)
    resp = client.get("/api/v1/submissions?approval_status=pending", headers=headers)
    assert resp.status_code == 200
    ids = [i["id"] for i in resp.json()]
    assert submission_id not in ids


def test_list_includes_score(client, setup_data):
    """TC-APR-010: Submission list items include score/grade from report."""
    _, submission_id, teacher_id = setup_data
    headers = _login_teacher(client, teacher_id)

    resp = client.get("/api/v1/submissions", headers=headers)
    items = resp.json()
    sub = next(i for i in items if i["id"] == submission_id)
    assert sub["score"] == 85
    assert sub["grade"] == "B"
