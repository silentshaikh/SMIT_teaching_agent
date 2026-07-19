import asyncio
from uuid import uuid4

from fastapi import APIRouter, UploadFile, Form, Depends, HTTPException

from models.schemas import SubmissionInput, SubmitResponse
from agents.orchestrator import process_submission
from api.routes.auth import verify_token

router = APIRouter(prefix="/api/v1", tags=["submit"])

ALLOWED_EXTENSIONS = {".js", ".py", ".html"}
MAX_FILE_SIZE = 50 * 1024

_background_tasks: set[asyncio.Task] = set()


@router.post("/submit", response_model=SubmitResponse, status_code=202)
async def submit_assignment(
    file: UploadFile,
    student_id: str = Form(...),
    assignment_name: str = Form(...),
    assignment_id: str = Form(None),
    rubric_id: str = Form(...),
    _: dict = Depends(verify_token),
):
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
