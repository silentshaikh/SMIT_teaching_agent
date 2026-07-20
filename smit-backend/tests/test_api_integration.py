"""API integration tests — section 10: 100% endpoints, valid + invalid inputs."""
from unittest.mock import patch, AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from api.main import app
from api.routes.auth import verify_token


@pytest.fixture(autouse=True)
def override_auth():
    async def _fake_auth():
        return {"sub": "admin", "role": "teacher"}
    app.dependency_overrides[verify_token] = _fake_auth
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
def mock_startup():
    with patch("api.main.init_db"):
        yield


class FakeSession:
    """Synchronous stand-in for AsyncSession that returns predictable mocks."""

    def __init__(self):
        self.scalar_return = None
        self.all_return = []
        self.scalars_all_return = []

    async def execute(self, stmt):
        result = MagicMock()
        result.scalar_one_or_none.return_value = self.scalar_return
        result.scalars.return_value.all.return_value = self.scalars_all_return
        result.all.return_value = self.all_return
        result.scalar.return_value = self.scalar_return
        return result

    def add(self, obj):
        obj.id = "generated-uuid"

    async def commit(self):
        pass

    async def flush(self):
        pass

    async def refresh(self, obj):
        obj.id = "generated-uuid"
        obj.name = obj.name or "test"
        obj.language = obj.language or "python"
        obj.criteria_json = obj.criteria_json or {}
        obj.max_score = obj.max_score or 100
        obj.created_by = obj.created_by or "teacher"


@pytest.fixture(autouse=True)
def fake_session():
    sess = FakeSession()

    async def _get_session():
        yield sess

    from api.routes.reports import get_session as reports_gs
    from api.routes.admin import get_session as admin_gs
    app.dependency_overrides[reports_gs] = _get_session
    app.dependency_overrides[admin_gs] = _get_session
    yield sess
    app.dependency_overrides.pop(reports_gs, None)
    app.dependency_overrides.pop(admin_gs, None)


class TestHealthEndpoint:
    async def test_health_returns_ok(self, client):
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok", "version": "1.0.0"}


class TestSubmitEndpoint:
    @pytest.mark.asyncio
    async def test_submit_valid_python(self, client):
        with patch("api.routes.submit.process_submission"):
            app.dependency_overrides[verify_token] = lambda: {"sub": "s1", "role": "student"}
            content = b"def add(a, b):\n    return a + b\n"
            files = {"file": ("solution.py", content, "text/x-python")}
            data = {"assignment_name": "hw1", "rubric_id": "r1"}
            resp = await client.post("/api/v1/submit", data=data, files=files)
            assert resp.status_code == 202
            body = resp.json()
            assert "submission_id" in body
            assert body["status"] == "processing"
            assert body["poll_url"].startswith("/api/v1/report/")

    @pytest.mark.asyncio
    async def test_submit_invalid_extension(self, client):
        app.dependency_overrides[verify_token] = lambda: {"sub": "s1", "role": "student"}
        files = {"file": ("notes.txt", b"content", "text/plain")}
        data = {"assignment_name": "hw1", "rubric_id": "r1"}
        resp = await client.post("/api/v1/submit", data=data, files=files)
        assert resp.status_code == 422
        assert "Invalid file type" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_submit_file_too_large(self, client):
        app.dependency_overrides[verify_token] = lambda: {"sub": "s1", "role": "student"}
        content = b"x" * (51 * 1024)
        files = {"file": ("large.py", content, "text/x-python")}
        data = {"assignment_name": "hw1", "rubric_id": "r1"}
        resp = await client.post("/api/v1/submit", data=data, files=files)
        assert resp.status_code == 413
        assert "too large" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_submit_all_allowed_extensions(self, client):
        with patch("api.routes.submit.process_submission"):
            app.dependency_overrides[verify_token] = lambda: {"sub": "s1", "role": "student"}
            for ext in [".py", ".js", ".html"]:
                files = {"file": (f"file{ext}", b"content", "application/octet-stream")}
                data = {"assignment_name": "hw1", "rubric_id": "r1"}
                resp = await client.post("/api/v1/submit", data=data, files=files)
                assert resp.status_code == 202, f"Failed for {ext}"

    @pytest.mark.asyncio
    async def test_submit_rejects_teacher(self, client):
        files = {"file": ("solution.py", b"def x(): pass", "text/x-python")}
        data = {"assignment_name": "hw1", "rubric_id": "r1"}
        resp = await client.post("/api/v1/submit", data=data, files=files)
        assert resp.status_code == 403


class TestReportEndpoint:
    @pytest.mark.asyncio
    async def test_get_report_not_found(self, fake_session):
        fake_session.scalar_return = None
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/report/nonexistent")
            assert resp.status_code == 404


class TestHistoryEndpoint:
    @pytest.mark.asyncio
    async def test_history_empty(self, fake_session):
        fake_session.all_return = []
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/history/unknown")
            assert resp.status_code == 200
            assert resp.json() == []


class TestRubricsEndpoints:
    @pytest.mark.asyncio
    async def test_list_empty(self, fake_session):
        fake_session.scalars_all_return = []
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/rubrics")
            assert resp.status_code == 200
            assert resp.json() == []

    @pytest.mark.asyncio
    async def test_create_rubric(self, fake_session):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "name": "hw1-rubric", "language": "python",
                "criteria": {"syntax": 30, "logic": 40, "style": 30},
                "max_score": 100, "created_by": "teacher1",
            }
            resp = await client.post("/api/v1/rubrics", json=payload)
            assert resp.status_code == 201
            data = resp.json()
            assert data["assignment_name"] == "hw1-rubric"
            assert "id" in data


class TestDashboardEndpoint:
    @pytest.mark.asyncio
    async def test_dashboard_aggregates(self, fake_session):
        fake_session.scalar_return = 10
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/dashboard/test-batch")
            assert resp.status_code == 200
            data = resp.json()
            assert data["batch"] == "test-batch"
            assert "total_students" in data


class TestDownloadEndpoint:
    @pytest.mark.asyncio
    async def test_download_not_found(self, fake_session):
        fake_session.scalar_return = None
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/report/nonexistent/download")
            assert resp.status_code == 404


class TestAuthFailure:
    @pytest.mark.asyncio
    async def test_no_token_dev_mode_allows_teacher(self, client):
        """In dev_mode, no token = teacher bypass. Verify it returns 200."""
        app.dependency_overrides.clear()
        resp = await client.get("/api/v1/rubrics")
        assert resp.status_code == 200
