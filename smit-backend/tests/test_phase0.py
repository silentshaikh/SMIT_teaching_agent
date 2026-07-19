"""Phase 0 tests — auth, courses/assignments, source_code, rubric versioning."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime, timezone


# ── Auth tests ──────────────────────────────────────

def test_login_student_success(client):
    """TC-P0-001: Student can login with correct credentials."""
    from api.routes.auth import hash_password
    from models.db_models import StudentModel
    from db.session import AsyncSessionLocal

    _uid = uuid4().hex[:8]

    async def _create():
        async with AsyncSessionLocal() as session:
            student = StudentModel(
                id=f"login-test-student-{_uid}",
                name="Test Student",
                email=f"student-{_uid}@test.com",
                password_hash=hash_password("pass123"),
                batch="SMIT-Batch-42",
            )
            session.add(student)
            await session.commit()
    import asyncio
    asyncio.run(_create())

    r = client.post("/api/v1/auth/login", json={
        "email": f"student-{_uid}@test.com",
        "password": "pass123",
    })
    assert r.status_code == 200
    data = r.json()
    assert "token" in data
    assert data["role"] == "student"
    assert data["user_id"] == f"login-test-student-{_uid}"


def test_login_teacher_success(client):
    """TC-P0-002: Teacher can login with correct credentials."""
    from api.routes.auth import hash_password
    from models.db_models import TeacherModel
    from db.session import AsyncSessionLocal

    _uid = uuid4().hex[:8]

    async def _create():
        async with AsyncSessionLocal() as session:
            teacher = TeacherModel(
                id=f"login-test-teacher-{_uid}",
                name="Test Teacher",
                email=f"teacher-{_uid}@test.com",
                password_hash=hash_password("pass456"),
            )
            session.add(teacher)
            await session.commit()
    import asyncio
    asyncio.run(_create())

    r = client.post("/api/v1/auth/login", json={
        "email": f"teacher-{_uid}@test.com",
        "password": "pass456",
    })
    assert r.status_code == 200
    data = r.json()
    assert "token" in data
    assert data["role"] == "teacher"


def test_login_wrong_password(client):
    """TC-P0-003: Login fails with wrong password."""
    r = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@test.com",
        "password": "wrong",
    })
    assert r.status_code == 401


def test_student_wrong_password_does_not_fall_through_to_teacher(client):
    """TC-P0-003b: Student with wrong password must NOT authenticate as a teacher."""
    from api.routes.auth import hash_password
    from models.db_models import StudentModel, TeacherModel
    from db.session import AsyncSessionLocal

    _uid = uuid4().hex[:8]

    async def _create():
        async with AsyncSessionLocal() as session:
            session.add(StudentModel(
                id=f"s-fallthrough-{_uid}", name="S", email=f"shared-{_uid}@test.com",
                password_hash=hash_password("student-pass"), batch="B1",
            ))
            session.add(TeacherModel(
                id=f"t-fallthrough-{_uid}", name="T", email=f"shared-{_uid}@test.com",
                password_hash=hash_password("teacher-pass"),
            ))
            await session.commit()
    import asyncio
    asyncio.run(_create())

    # Try logging in with student email but teacher password — should fail
    r = client.post("/api/v1/auth/login", json={
        "email": f"shared-{_uid}@test.com",
        "password": "teacher-pass",
    })
    assert r.status_code == 401


def test_login_returns_valid_jwt(client):
    """TC-P0-004: Login returns a decodable JWT."""
    from jose import jwt
    from api.routes.auth import hash_password
    from models.db_models import TeacherModel
    from db.session import AsyncSessionLocal

    _uid = uuid4().hex[:8]

    async def _create():
        async with AsyncSessionLocal() as session:
            teacher = TeacherModel(
                id=f"jwt-test-teacher-{_uid}",
                name="JWT Teacher",
                email=f"jwt-{_uid}@test.com",
                password_hash=hash_password("secret"),
            )
            session.add(teacher)
            await session.commit()
    import asyncio
    asyncio.run(_create())

    r = client.post("/api/v1/auth/login", json={
        "email": f"jwt-{_uid}@test.com",
        "password": "secret",
    })
    token = r.json()["token"]
    from config import settings
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    assert payload["sub"] == f"jwt-test-teacher-{_uid}"
    assert payload["role"] == "teacher"


def test_verify_token_rejects_bad_token(client):
    """TC-P0-005: verify_token rejects invalid token when jwt_secret is set."""
    import config as cfg
    original = cfg.settings.jwt_secret
    cfg.settings.jwt_secret = "real-secret-for-testing"
    try:
        r = client.get(
            "/api/v1/rubrics",
            headers={"Authorization": "Bearer fake-token"},
        )
        assert r.status_code == 401
    finally:
        cfg.settings.jwt_secret = original


# ── Course/Assignment tests ─────────────────────────

def test_create_course(client):
    """TC-P0-006: Create a course."""
    r = client.post("/api/v1/courses", json={
        "name": "Intro to Python",
        "batch": "SMIT-Batch-42",
    })
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Intro to Python"
    assert data["batch"] == "SMIT-Batch-42"
    assert "id" in data


def test_list_courses(client):
    """TC-P0-007: List courses."""
    client.post("/api/v1/courses", json={"name": "Course A", "batch": "B1"})
    client.post("/api/v1/courses", json={"name": "Course B", "batch": "B2"})
    r = client.get("/api/v1/courses")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 2


def test_list_courses_filter_by_batch(client):
    """TC-P0-008: Filter courses by batch."""
    client.post("/api/v1/courses", json={"name": "X", "batch": "FILTER-BATCH"})
    r = client.get("/api/v1/courses?batch=FILTER-BATCH")
    assert r.status_code == 200
    names = [c["name"] for c in r.json()]
    assert "X" in names


def test_create_assignment(client):
    """TC-P0-009: Create an assignment under a course."""
    course_resp = client.post("/api/v1/courses", json={"name": "C1", "batch": "B1"})
    course_id = course_resp.json()["id"]

    r = client.post("/api/v1/assignments", json={
        "course_id": course_id,
        "name": "Homework 1",
        "rubric_id": None,
    })
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Homework 1"
    assert data["course_id"] == course_id


def test_list_assignments(client):
    """TC-P0-010: List assignments."""
    course_resp = client.post("/api/v1/courses", json={"name": "C2", "batch": "B2"})
    course_id = course_resp.json()["id"]
    client.post("/api/v1/assignments", json={"course_id": course_id, "name": "A1"})
    client.post("/api/v1/assignments", json={"course_id": course_id, "name": "A2"})

    r = client.get(f"/api/v1/assignments?course_id={course_id}")
    assert r.status_code == 200
    assert len(r.json()) >= 2


# ── Source code storage ─────────────────────────────

@patch("api.routes.submit.process_submission")
def test_submit_stores_source_code(mock_orch, client, sample_js_code):
    """TC-P0-011: Submit stores source_code in DB."""
    mock_orch.return_value = AsyncMock()

    from models.db_models import SubmissionModel
    from db.session import AsyncSessionLocal

    async def _check():
        # Get the submission that was created
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            result = await session.execute(
                select(SubmissionModel).order_by(SubmissionModel.created_at.desc()).limit(1)
            )
            sub = result.scalar_one_or_none()
            if sub:
                assert sub.source_code is not None
                assert len(sub.source_code) > 0
    import asyncio

    r = client.post(
        "/api/v1/submit",
        data={"student_id": "src-test", "assignment_name": "HW1", "rubric_id": "r1"},
        files={"file": ("app.js", sample_js_code, "text/javascript")},
    )
    assert r.status_code in [200, 202]
    asyncio.run(_check())


# ── Rubric versioning ───────────────────────────────

def test_create_rubric_creates_version(client):
    """TC-P0-012: Creating a rubric creates version 1."""
    r = client.post("/api/v1/rubrics", json={
        "name": "Versioned Rubric",
        "language": "python",
        "criteria": {"syntax": 50, "logic": 50},
        "max_score": 100,
        "created_by": "teacher-v",
    })
    assert r.status_code == 201
    rubric_id = r.json()["id"]

    versions_r = client.get(f"/api/v1/rubrics/{rubric_id}/versions")
    assert versions_r.status_code == 200
    versions = versions_r.json()
    assert len(versions) >= 1
    assert versions[0]["version_number"] == 1


def test_update_rubric_creates_new_version(client):
    """TC-P0-013: Updating a rubric creates a new version."""
    r = client.post("/api/v1/rubrics", json={
        "name": "Update Test",
        "language": "python",
        "criteria": {"syntax": 100},
        "max_score": 100,
        "created_by": "teacher-u",
    })
    rubric_id = r.json()["id"]

    r2 = client.put(f"/api/v1/rubrics/{rubric_id}", json={
        "name": "Update Test v2",
        "language": "python",
        "criteria": {"syntax": 50, "logic": 50},
        "max_score": 100,
        "created_by": "teacher-u",
    })
    assert r2.status_code == 200

    versions_r = client.get(f"/api/v1/rubrics/{rubric_id}/versions")
    versions = versions_r.json()
    assert len(versions) >= 2
    assert versions[0]["version_number"] == 2


def test_rubric_update_nonexistent_returns_404(client):
    """TC-P0-014: Updating a nonexistent rubric returns 404."""
    r = client.put(f"/api/v1/rubrics/{uuid4()}", json={
        "name": "X", "language": "python", "criteria": {}, "max_score": 100, "created_by": "t",
    })
    assert r.status_code == 404
