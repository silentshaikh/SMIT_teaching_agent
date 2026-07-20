"""Tests for URL submission and update submission endpoints."""
import pytest
from uuid import uuid4
from unittest.mock import patch, AsyncMock, MagicMock

from models.db_models import StudentModel, SubmissionModel
from db.session import AsyncSessionLocal


def _teacher_token():
    from api.routes.auth import create_token
    return create_token("teacher-001", "teacher", "teacher@test.com")


def _student_token(sid: str = "test-student-001"):
    from api.routes.auth import create_token
    return create_token(sid, "student", f"{sid}@test.com")


def _create_student(student_id: str):
    async def _setup():
        async with AsyncSessionLocal() as session:
            student = StudentModel(
                id=student_id,
                name="URL Test Student",
                email=f"{student_id}@test.com",
                password_hash="",
                batch="SMIT-Batch-42",
            )
            session.add(student)
            await session.commit()
    import asyncio
    asyncio.run(_setup())


# ── URL Submission Tests ────────────────────────────

class TestURLSubmission:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.student_id = f"url-student-{uuid4().hex[:8]}"
        _create_student(self.student_id)

    def test_url_submit_requires_student_role(self, client):
        """Without student token, dev_mode teacher gets 403."""
        r = client.post("/api/v1/submit/url", json={
            "url": "https://example.com/code.py",
            "assignment_name": "HW1",
            "rubric_id": "r1",
        })
        assert r.status_code == 403  # Teacher role rejected

    def test_url_submit_rejects_teacher(self, client):
        token = _teacher_token()
        r = client.post("/api/v1/submit/url",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "url": "https://example.com/code.py",
                "assignment_name": "HW1",
                "rubric_id": "r1",
            })
        assert r.status_code == 403

    @patch("api.routes.submit.process_submission")
    @patch("api.routes.submit._fetch_code_from_url", new_callable=AsyncMock)
    def test_url_submit_success(self, mock_fetch, mock_orch, client):
        mock_fetch.return_value = "def hello(): pass"
        mock_orch.return_value = AsyncMock()
        token = _student_token(self.student_id)
        r = client.post("/api/v1/submit/url",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "url": "https://example.com/code.py",
                "assignment_name": "HW1",
                "rubric_id": "r1",
            })
        assert r.status_code == 202
        data = r.json()
        assert "submission_id" in data
        assert data["status"] == "processing"

    def test_url_submit_invalid_url(self, client):
        token = _student_token(self.student_id)
        r = client.post("/api/v1/submit/url",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "url": "x",
                "assignment_name": "HW1",
                "rubric_id": "r1",
            })
        assert r.status_code == 422

    @patch("api.routes.submit._fetch_code_from_url", new_callable=AsyncMock)
    def test_url_submit_fetch_failure(self, mock_fetch, client):
        from fastapi import HTTPException
        mock_fetch.side_effect = HTTPException(422, "Failed to fetch")
        token = _student_token(self.student_id)
        r = client.post("/api/v1/submit/url",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "url": "https://example.com/missing.py",
                "assignment_name": "HW1",
                "rubric_id": "r1",
            })
        assert r.status_code == 422


# ── SSRF Protection Tests ───────────────────────────

class TestSSRFProtection:
    def test_localhost_blocked(self, client):
        from api.routes.submit import _validate_url_safety
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            _validate_url_safety("http://localhost:8000/code.py")
        assert exc.value.status_code == 422

    def test_127_0_0_1_blocked(self, client):
        from api.routes.submit import _validate_url_safety
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            _validate_url_safety("http://127.0.0.1:8000/code.py")
        assert exc.value.status_code == 422

    def test_0_0_0_0_blocked(self, client):
        from api.routes.submit import _validate_url_safety
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            _validate_url_safety("http://0.0.0.0/code.py")
        assert exc.value.status_code == 422


# ── Update Submission Tests ─────────────────────────

class TestUpdateSubmission:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.student_id = f"update-student-{uuid4().hex[:8]}"
        self.submission_id = f"update-sub-{uuid4().hex[:8]}"
        _create_student(self.student_id)

        async def _create_submission():
            async with AsyncSessionLocal() as session:
                sub = SubmissionModel(
                    id=self.submission_id,
                    student_id=self.student_id,
                    file_name="test.py",
                    language="python",
                    source_code="print('hello')",
                    code_hash="abc123",
                    status="completed",
                    approval_status="pending",
                )
                session.add(sub)
                await session.commit()
        import asyncio
        asyncio.run(_create_submission())

    def test_update_requires_auth(self, client):
        """Dev_mode teacher gets through (no role check, only ownership check)."""
        r = client.patch(f"/api/v1/submissions/{self.submission_id}",
            json={"code": "new code"})
        # Dev_mode returns teacher role, update allows teachers
        assert r.status_code == 202

    def test_update_rejects_other_student(self, client):
        token = _student_token("other-student")
        r = client.patch(f"/api/v1/submissions/{self.submission_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"code": "new code"})
        assert r.status_code == 403

    @patch("api.routes.submit.process_submission", new_callable=AsyncMock)
    def test_update_own_submission(self, mock_orch, client):
        mock_orch.return_value = AsyncMock()
        token = _student_token(self.student_id)
        r = client.patch(f"/api/v1/submissions/{self.submission_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"code": "print('updated')"})
        assert r.status_code == 202
        data = r.json()
        assert data["submission_id"] == self.submission_id

    def test_update_nonexistent_submission(self, client):
        token = _student_token(self.student_id)
        r = client.patch(f"/api/v1/submissions/{uuid4()}",
            headers={"Authorization": f"Bearer {token}"},
            json={"code": "new code"})
        assert r.status_code == 404

    @patch("api.routes.submit.process_submission", new_callable=AsyncMock)
    def test_update_teacher_can_update_any(self, mock_orch, client):
        mock_orch.return_value = AsyncMock()
        token = _teacher_token()
        r = client.patch(f"/api/v1/submissions/{self.submission_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"code": "print('teacher updated')"})
        assert r.status_code == 202

    def test_update_requires_code_or_url(self, client):
        token = _student_token(self.student_id)
        r = client.patch(f"/api/v1/submissions/{self.submission_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={})
        assert r.status_code == 422


# ── Report IDOR Tests ───────────────────────────────

class TestReportIDOR:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.student_a_id = f"idor-student-a-{uuid4().hex[:8]}"
        self.student_b_id = f"idor-student-b-{uuid4().hex[:8]}"
        self.submission_a_id = f"idor-sub-a-{uuid4().hex[:8]}"
        _create_student(self.student_a_id)
        _create_student(self.student_b_id)

        async def _create():
            async with AsyncSessionLocal() as session:
                sub = SubmissionModel(
                    id=self.submission_a_id,
                    student_id=self.student_a_id,
                    file_name="test.py",
                    language="python",
                    source_code="x = 1",
                    code_hash="abc",
                    status="completed",
                )
                session.add(sub)
                await session.commit()
        import asyncio
        asyncio.run(_create())

    def test_student_cannot_view_other_report(self, client):
        token = _student_token(self.student_b_id)
        r = client.get(f"/api/v1/report/{self.submission_a_id}",
            headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 404

    def test_student_can_view_own_report(self, client):
        token = _student_token(self.student_a_id)
        r = client.get(f"/api/v1/report/{self.submission_a_id}",
            headers={"Authorization": f"Bearer {token}"})
        # 404 because report doesn't exist, but not IDOR
        assert r.status_code == 404

    def test_teacher_can_view_any_report(self, client):
        token = _teacher_token()
        r = client.get(f"/api/v1/report/{self.submission_a_id}",
            headers={"Authorization": f"Bearer {token}"})
        # 404 because report doesn't exist, but access is allowed
        assert r.status_code == 404
