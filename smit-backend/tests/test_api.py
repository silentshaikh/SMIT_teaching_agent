import pytest
from uuid import uuid4
from unittest.mock import patch
from httpx import AsyncClient
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from api.main import app
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data
    assert data["status"] == "ok"


@patch("api.routes.submit.process_submission")
def test_submit_valid_js_file(mock_orch, client):
    mock_orch.return_value = str(uuid4())
    js_code = b"const x = 1;"
    r = client.post(
      "/api/v1/submit",
      data={
        "student_id": "s001",
        "assignment_name": "Week 1 JS",
        "rubric_id": "rubric_js_w1"
      },
      files={"file": ("app.js", js_code, "text/javascript")}
    )
    assert r.status_code in [200, 202]
    data = r.json()
    assert "submission_id" in data


def test_submit_invalid_file_type(client):
    r = client.post(
      "/api/v1/submit",
      data={
        "student_id": "s001",
        "assignment_name": "Week 1",
        "rubric_id": "rubric_js_w1"
      },
      files={"file": ("malware.exe", b"MZ...", "application/octet-stream")}
    )
    assert r.status_code == 422


def test_submit_file_too_large(client):
    big_code = b"x" * 60_000
    r = client.post(
      "/api/v1/submit",
      data={
        "student_id": "s001",
        "assignment_name": "Week 1",
        "rubric_id": "rubric_js_w1"
      },
      files={"file": ("app.js", big_code, "text/javascript")}
    )
    assert r.status_code == 413


def test_get_report_not_found(client):
    fake_id = str(uuid4())
    r = client.get(f"/api/v1/report/{fake_id}")
    assert r.status_code == 404


def test_get_rubrics(client):
    r = client.get("/api/v1/rubrics")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
