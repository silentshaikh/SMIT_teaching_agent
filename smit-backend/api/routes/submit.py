import asyncio
import hashlib
import ipaddress
import re
import socket
from socket import getaddrinfo
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from fastapi import APIRouter, UploadFile, Form, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import SubmissionInput, SubmitResponse
from models.db_models import SubmissionModel, ReportModel
from agents.orchestrator import process_submission
from db.session import get_session
from api.routes.auth import verify_token

router = APIRouter(prefix="/api/v1", tags=["submit"])

ALLOWED_EXTENSIONS = {".js", ".py", ".html"}
MAX_FILE_SIZE = 50 * 1024

_background_tasks: set[asyncio.Task] = set()


# ── URL helper ───────────────────────────────────────

def _detect_language_from_url(url: str) -> str | None:
    lower = url.lower()
    if lower.endswith(".py") or "python" in lower:
        return "python"
    if lower.endswith(".js") or "javascript" in lower or "jsx" in lower:
        return "javascript"
    if lower.endswith(".html") or "html" in lower:
        return "html"
    return None


def _detect_language_from_content(code: str) -> str:
    if code.lstrip().startswith(("def ", "import ", "from ", "class ", "print(")):
        return "python"
    if code.lstrip().startswith(("function ", "const ", "let ", "var ", "import ", "export ")):
        return "javascript"
    if code.lstrip().startswith(("<!DOCTYPE", "<html", "<head", "<body")):
        return "html"
    return "python"


def _is_private_ip(hostname: str) -> bool:
    """Check if hostname resolves to a private/reserved IP address."""
    try:
        addrs = getaddrinfo(hostname, None)
        for family, _, _, _, sockaddr in addrs:
            ip = ipaddress.ip_address(sockaddr[0])
            if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
                return True
        return False
    except (socket.gaierror, ValueError):
        return True  # Fail closed: if we can't resolve, block it


def _validate_url_safety(url: str) -> None:
    """Block SSRF to private/internal networks."""
    parsed = urlparse(url)
    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(422, "Invalid URL: no hostname")

    blocked = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"}
    if hostname.lower() in blocked:
        raise HTTPException(422, "URLs targeting localhost are not allowed")

    if _is_private_ip(hostname):
        raise HTTPException(422, "URLs targeting private/internal networks are not allowed")


def _convert_github_url(url: str) -> str:
    """Convert GitHub blob URL to raw URL."""
    # https://github.com/user/repo/blob/main/file.py → raw
    match = re.match(r"https://github\.com/([^/]+)/([^/]+)/blob/(.+)", url)
    if match:
        return f"https://raw.githubusercontent.com/{match.group(1)}/{match.group(2)}/{match.group(3)}"
    return url


async def _fetch_code_from_url(url: str) -> str:
    _validate_url_safety(url)
    raw_url = _convert_github_url(url)
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        resp = await client.get(raw_url)
        if resp.status_code != 200:
            raise HTTPException(422, f"Failed to fetch code from URL (status {resp.status_code})")
        return resp.text


# ── File submission (existing) ───────────────────────

@router.post("/submit", response_model=SubmitResponse, status_code=202)
async def submit_assignment(
    file: UploadFile,
    assignment_name: str = Form(...),
    assignment_id: str = Form(None),
    rubric_id: str = Form(...),
    user: dict = Depends(verify_token),
):
    if user.get("role") != "student":
        raise HTTPException(403, "Only students can submit assignments")

    student_id = user["sub"]
    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(422, f"Invalid file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(413, f"File too large ({len(contents)} bytes). Maximum: 50KB")

    code = contents.decode("utf-8")
    lang_map = {".js": "javascript", ".py": "python", ".html": "html"}
    submission_id = str(uuid4())
    input_data = SubmissionInput(
        student_id=student_id,
        assignment_id=assignment_id,
        assignment_name=assignment_name,
        language=lang_map[ext],
        code=code,
        rubric_id=rubric_id,
    )

    task = asyncio.create_task(process_submission(submission_id, input_data))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    return SubmitResponse(
        submission_id=submission_id,
        status="processing",
        poll_url=f"/api/v1/report/{submission_id}",
    )


# ── URL submission (new) ────────────────────────────

class URLSubmitRequest(BaseModel):
    url: str = Field(min_length=10, max_length=2048)
    assignment_name: str
    assignment_id: str | None = None
    rubric_id: str


@router.post("/submit/url", response_model=SubmitResponse, status_code=202)
async def submit_via_url(
    body: URLSubmitRequest,
    user: dict = Depends(verify_token),
):
    if user.get("role") != "student":
        raise HTTPException(403, "Only students can submit assignments")

    student_id = user["sub"]
    code = await _fetch_code_from_url(body.url)

    lang = _detect_language_from_url(body.url) or _detect_language_from_content(code)

    submission_id = str(uuid4())
    input_data = SubmissionInput(
        student_id=student_id,
        assignment_id=body.assignment_id,
        assignment_name=body.assignment_name,
        language=lang,
        code=code,
        rubric_id=body.rubric_id,
    )

    task = asyncio.create_task(process_submission(submission_id, input_data))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    return SubmitResponse(
        submission_id=submission_id,
        status="processing",
        poll_url=f"/api/v1/report/{submission_id}",
    )


# ── Update existing submission (new) ─────────────────

class UpdateSubmissionRequest(BaseModel):
    code: str | None = None
    url: str | None = None
    rubric_id: str | None = None


@router.patch("/submissions/{submission_id}", response_model=SubmitResponse, status_code=202)
async def update_submission(
    submission_id: str,
    body: UpdateSubmissionRequest,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(verify_token),
):
    result = await session.execute(
        select(SubmissionModel).where(SubmissionModel.id == submission_id)
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        raise HTTPException(404, "Submission not found")

    # Only the student who owns the submission can update it
    if user.get("sub") != sub.student_id and user.get("role") != "teacher":
        raise HTTPException(403, "You can only update your own submissions")

    # Determine new code
    new_code = body.code
    if body.url:
        new_code = await _fetch_code_from_url(body.url)  # SSRF check inside _fetch_code_from_url
    if new_code is None:
        raise HTTPException(422, "Provide either 'code' or 'url'")

    new_rubric = body.rubric_id or sub.rubric_version_id

    # Update submission record
    sub.source_code = new_code
    sub.code_hash = hashlib.sha256(new_code.encode()).hexdigest()[:16]
    sub.status = "pending"
    sub.approval_status = "pending"

    # Delete old report if exists
    old_report = await session.execute(
        select(ReportModel).where(ReportModel.submission_id == submission_id)
    )
    old = old_report.scalar_one_or_none()
    if old:
        await session.delete(old)

    await session.commit()

    # Re-run pipeline
    input_data = SubmissionInput(
        student_id=sub.student_id,
        assignment_id=sub.assignment_id,
        assignment_name=sub.file_name,
        language=sub.language,
        code=new_code,
        rubric_id=new_rubric or "default",
    )

    task = asyncio.create_task(process_submission(submission_id, input_data))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    return SubmitResponse(
        submission_id=submission_id,
        status="processing",
        poll_url=f"/api/v1/report/{submission_id}",
    )
