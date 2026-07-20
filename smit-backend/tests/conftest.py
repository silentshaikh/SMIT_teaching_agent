import pytest
import os
import sys
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient
from httpx import AsyncClient

# Set dummy env vars before any import
os.environ.setdefault("OPENROUTER_API_KEY", "sk-or-test-key-123")
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("MAX_FILE_SIZE_KB", "50")
os.environ.setdefault("ALLOWED_EXTENSIONS", ".js,.py,.html,.css")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")

# Override settings before importing app
import config as cfg
cfg.settings = cfg.Settings(_env_file=None, dev_mode=True, teacher_invite_code="test-invite-code")

_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_here)
if _root not in sys.path:
    sys.path.insert(0, _root)

from api.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def async_client():
    return AsyncClient(app=app, base_url="http://test")


@pytest.fixture
def sample_js_code() -> bytes:
    return b"""
const studentName = 'Ahmed';
const age = 20;

function greet(name) {
  return 'Hello, ' + name + '!';
}

console.log(greet(studentName));
"""


@pytest.fixture
def bad_js_code() -> bytes:
    return b"""
const name = 'Ahmed'
function greet(name {
  console.log('Hello ' + name
}
greet(name)
"""


@pytest.fixture
def sample_python_code() -> bytes:
    return b"""
student_name = 'Fatima'
age = 22

def greet(name):
    return f'Hello, {name}!'

print(greet(student_name))
"""


@pytest.fixture
def valid_submission_data():
    return {
        "student_id": "test_student_001",
        "assignment_name": "Week 1 JS",
        "rubric_id": "rubric_js_w1",
    }


@pytest.fixture
def mock_report_dict():
    from uuid import uuid4
    from datetime import datetime, timezone
    return {
        "submission_id": str(uuid4()),
        "student_id": "test_student_001",
        "assignment_name": "Week 1 JS",
        "score": 82,
        "grade": "B",
        "mistakes": [],
        "corrected_code": "const x = 1;",
        "explanation_en": "Good attempt. Keep practicing.",
        "explanation_urdu": "Acha koshish tha. Aur practice karo.",
        "suggestions": ["Use const instead of var"],
        "next_topics": ["Functions", "Scope"],
        "breakdown": {"syntax": 25, "logic": 30, "style": 27},
        "processing_time_ms": 4200,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
