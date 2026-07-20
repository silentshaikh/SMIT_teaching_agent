"""Auth register endpoint tests."""
import pytest
from uuid import uuid4


def test_register_student_success(client):
    """TC-REG-001: Student can register with valid data."""
    _uid = uuid4().hex[:8]
    r = client.post("/api/v1/auth/register", json={
        "name": "New Student",
        "email": f"reg-student-{_uid}@test.com",
        "password": "pass123",
        "role": "student",
        "batch": "SMIT-Batch-1",
    })
    assert r.status_code == 200
    data = r.json()
    assert "token" in data
    assert data["role"] == "student"
    assert data["name"] == "New Student"
    assert data["user_id"]


def test_register_teacher_success(client):
    """TC-REG-002: Teacher can register with valid data."""
    _uid = uuid4().hex[:8]
    r = client.post("/api/v1/auth/register", json={
        "name": "New Teacher",
        "email": f"reg-teacher-{_uid}@test.com",
        "password": "pass456",
        "role": "teacher",
        "invite_code": "test-invite-code",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["role"] == "teacher"
    assert data["name"] == "New Teacher"


def test_register_teacher_wrong_invite_code_rejected(client):
    """TC-REG-008: Teacher with wrong invite code is rejected."""
    _uid = uuid4().hex[:8]
    r = client.post("/api/v1/auth/register", json={
        "name": "Bad Invite Teacher",
        "email": f"badinvite-{_uid}@test.com",
        "password": "pass456",
        "role": "teacher",
        "invite_code": "wrong-code",
    })
    assert r.status_code == 403


def test_register_teacher_no_invite_code_rejected(client):
    """TC-REG-009: Teacher without invite code is rejected."""
    _uid = uuid4().hex[:8]
    r = client.post("/api/v1/auth/register", json={
        "name": "No Invite Teacher",
        "email": f"noinvite-{_uid}@test.com",
        "password": "pass456",
        "role": "teacher",
    })
    assert r.status_code == 403


def test_register_duplicate_email_rejected(client):
    """TC-REG-003: Registering with existing email returns 409."""
    _uid = uuid4().hex[:8]
    payload = {
        "name": "Dupe User",
        "email": f"dupe-{_uid}@test.com",
        "password": "pass123",
        "role": "teacher",
        "invite_code": "test-invite-code",
    }
    r1 = client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 200

    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409


def test_register_student_without_batch_rejected(client):
    """TC-REG-004: Student register without batch returns 422."""
    _uid = uuid4().hex[:8]
    r = client.post("/api/v1/auth/register", json={
        "name": "No Batch Student",
        "email": f"nobatch-{_uid}@test.com",
        "password": "pass123",
        "role": "student",
    })
    assert r.status_code == 422


def test_register_short_password_rejected(client):
    """TC-REG-005: Password < 6 chars returns 422."""
    _uid = uuid4().hex[:8]
    r = client.post("/api/v1/auth/register", json={
        "name": "Short Pass User",
        "email": f"short-{_uid}@test.com",
        "password": "12345",
        "role": "teacher",
    })
    assert r.status_code == 422


def test_register_then_login(client):
    """TC-REG-006: Can login immediately after registration."""
    _uid = uuid4().hex[:8]
    email = f"reglogin-{_uid}@test.com"
    r = client.post("/api/v1/auth/register", json={
        "name": "Reg Login User",
        "email": email,
        "password": "secure123",
        "role": "student",
        "batch": "Batch-A",
    })
    assert r.status_code == 200

    r2 = client.post("/api/v1/auth/login", json={"email": email, "password": "secure123", "role": "student"})
    assert r2.status_code == 200
    assert r2.json()["role"] == "student"


def test_register_cross_table_duplicate(client):
    """TC-REG-007: Email in students table cannot be reused by teachers."""
    from api.routes.auth import hash_password
    from models.db_models import StudentModel
    from db.session import AsyncSessionLocal
    import asyncio

    _uid = uuid4().hex[:8]
    email = f"cross-{_uid}@test.com"

    async def _create():
        async with AsyncSessionLocal() as session:
            student = StudentModel(
                id=f"cross-test-{_uid}",
                name="Existing Student",
                email=email,
                password_hash=hash_password("pass123"),
                batch="Batch-X",
            )
            session.add(student)
            await session.commit()
    asyncio.run(_create())

    r = client.post("/api/v1/auth/register", json={
        "name": "Cross User",
        "email": email,
        "password": "pass456",
        "role": "teacher",
        "invite_code": "test-invite-code",
    })
    assert r.status_code == 409
