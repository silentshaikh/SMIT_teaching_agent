"""Phase 2 teacher endpoints: analytics, override, bulk submit, rubric comparison."""

import io
import json
import zipfile
import logging
from collections import Counter
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import (
    BatchAnalytics, BatchMistakeStat,
    OverrideRequest,
    BulkSubmitResult,
)
from models.db_models import (
    SubmissionModel, ReportModel, StudentModel,
    AssignmentModel, CourseModel,
)
from db.session import get_session
from api.routes.auth import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["phase2"])


# ── 2.1 Batch-wide analytics ────────────────────────

@router.get("/batches/{batch}/analytics", response_model=BatchAnalytics)
async def get_batch_analytics(
    batch: str,
    assignment_id: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(verify_token),
):
    # Base query: submissions from students in this batch
    q = (
        select(SubmissionModel, ReportModel)
        .outerjoin(ReportModel, SubmissionModel.id == ReportModel.submission_id)
        .join(StudentModel, SubmissionModel.student_id == StudentModel.id)
        .where(
            StudentModel.batch == batch,
            SubmissionModel.status == "completed",
        )
    )

    if assignment_id:
        q = q.where(SubmissionModel.assignment_id == assignment_id)

    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            q = q.where(SubmissionModel.created_at >= dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            q = q.where(SubmissionModel.created_at <= dt_to)
        except ValueError:
            pass

    result = await session.execute(q.order_by(SubmissionModel.created_at.desc()))
    rows = result.all()

    total = len(rows)
    scores = []
    mistake_counter: Counter[str] = Counter()

    for sub, rep in rows:
        if rep:
            scores.append(rep.score)
            try:
                data = json.loads(rep.report_json)
                for m in data.get("mistakes", []):
                    mistake_counter[m.get("type", "unknown")] += 1
            except (json.JSONDecodeError, KeyError):
                pass

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
    total_mistakes = sum(mistake_counter.values()) or 1

    return BatchAnalytics(
        batch=batch,
        total_submissions=total,
        average_score=avg_score,
        mistake_stats=[
            BatchMistakeStat(
                type=t,
                count=c,
                percentage=round((c / total_mistakes) * 100, 1),
            )
            for t, c in mistake_counter.most_common()
        ],
        assignment_filter=assignment_id,
        date_from=date_from,
        date_to=date_to,
    )


# ── 2.3 Manual override ─────────────────────────────

@router.patch("/report/{submission_id}/override")
async def override_report(
    submission_id: str,
    body: OverrideRequest,
    session: AsyncSession = Depends(get_session),
    teacher: dict = Depends(verify_token),
):
    if teacher.get("role") != "teacher":
        raise HTTPException(403, "Only teachers can override scores")

    result = await session.execute(
        select(ReportModel).where(ReportModel.submission_id == submission_id)
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(404, "Report not found")

    report.override_score = body.new_score
    report.override_note = body.teacher_note
    report.overridden_by = teacher.get("sub", "unknown")
    report.overridden_at = datetime.now(timezone.utc)

    # Also patch the report_json so override fields appear in GET /report
    try:
        report_data = json.loads(report.report_json)
        report_data["override_score"] = body.new_score
        report_data["override_note"] = body.teacher_note
        report_data["overridden_by"] = teacher.get("sub", "unknown")
        report_data["overridden_at"] = datetime.now(timezone.utc).isoformat()
        report.report_json = json.dumps(report_data)
    except (json.JSONDecodeError, KeyError):
        pass

    await session.commit()
    return {"status": "ok", "submission_id": submission_id}


# ── 2.4 Bulk submission upload ───────────────────────

@router.post("/submit/bulk", response_model=BulkSubmitResult)
async def bulk_submit(
    file: UploadFile,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(verify_token),
):
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(422, "File must be a .zip archive")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(413, "Zip file too large (max 5MB)")

    try:
        zip_buffer = io.BytesIO(contents)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            filenames = zf.namelist()

            submitted = 0
            failed = 0
            results = []

            ALLOWED_EXTENSIONS = {".js", ".py", ".html"}

            for filename in filenames:
                if filename.endswith("/"):
                    continue
                ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
                if ext not in ALLOWED_EXTENSIONS:
                    results.append({"file": filename, "status": "skipped", "reason": f"unsupported type {ext}"})
                    failed += 1
                    continue

                # Extract student identifier from filename (e.g., "student123_app.js" → "student123")
                parts = filename.rsplit(".", 1)[0].split("_", 1)
                student_identifier = parts[0] if parts else filename.rsplit(".", 1)[0]

                try:
                    code = zf.read(filename).decode("utf-8")
                except Exception:
                    results.append({"file": filename, "status": "failed", "reason": "could not read file"})
                    failed += 1
                    continue

                submission_id = str(uuid4())
                lang_map = {".js": "javascript", ".py": "python", ".html": "html"}

                from models.schemas import SubmissionInput
                input_data = SubmissionInput(
                    student_id=student_identifier,
                    assignment_name=filename.rsplit(".", 1)[0],
                    language=lang_map.get(ext, "python"),
                    code=code,
                    rubric_id="default",
                )

                import asyncio
                from agents.orchestrator import process_submission
                asyncio.create_task(process_submission(submission_id, input_data))

                submitted += 1
                results.append({"file": filename, "status": "submitted", "submission_id": submission_id})
    except zipfile.BadZipFile:
        raise HTTPException(422, "Invalid zip file")

    return BulkSubmitResult(
        total=len(filenames),
        submitted=submitted,
        failed=failed,
        results=results,
    )


# ── 3.1 Exportable PDF report ────────────────────────

@router.get("/batches/{batch}/report.pdf")
async def export_batch_report_pdf(
    batch: str,
    date_from: str | None = None,
    date_to: str | None = None,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(verify_token),
):
    from fpdf import FPDF

    # Fetch analytics data
    q = (
        select(SubmissionModel, ReportModel, StudentModel)
        .outerjoin(ReportModel, SubmissionModel.id == ReportModel.submission_id)
        .join(StudentModel, SubmissionModel.student_id == StudentModel.id)
        .where(
            StudentModel.batch == batch,
            SubmissionModel.status == "completed",
        )
    )
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            q = q.where(SubmissionModel.created_at >= dt_from)
        except ValueError:
            pass
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            q = q.where(SubmissionModel.created_at <= dt_to)
        except ValueError:
            pass

    result = await session.execute(q.order_by(SubmissionModel.created_at.desc()))
    rows = result.all()

    total = len(rows)
    scores = []
    mistake_counter: Counter[str] = Counter()
    for sub, rep, student in rows:
        if rep:
            scores.append(rep.score)
            try:
                data = json.loads(rep.report_json)
                for m in data.get("mistakes", []):
                    mistake_counter[m.get("type", "unknown")] += 1
            except (json.JSONDecodeError, KeyError):
                pass

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
    total_mistakes = sum(mistake_counter.values()) or 1

    # Generate PDF
    pdf = FPDF()
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, f"Batch Report: {batch}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(5)

    # Summary
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 8, f"Total Submissions: {total}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, f"Average Score: {avg_score}", new_x="LMARGIN", new_y="NEXT")
    if date_from:
        pdf.cell(0, 8, f"Date From: {date_from}", new_x="LMARGIN", new_y="NEXT")
    if date_to:
        pdf.cell(0, 8, f"Date To: {date_to}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Grade distribution
    grade_counter: Counter[str] = Counter()
    for sub, rep, student in rows:
        if rep:
            try:
                data = json.loads(rep.report_json)
                grade_counter[data.get("grade", "N/A")] += 1
            except (json.JSONDecodeError, KeyError):
                pass

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Grade Distribution", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    for grade, count in sorted(grade_counter.items()):
        pct = round((count / total) * 100, 1) if total else 0
        pdf.cell(0, 7, f"  {grade}: {count} ({pct}%)", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Mistake breakdown
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Mistake Breakdown", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    for mtype, count in mistake_counter.most_common():
        pct = round((count / total_mistakes) * 100, 1)
        pdf.cell(0, 7, f"  {mtype}: {count} ({pct}%)", new_x="LMARGIN", new_y="NEXT")

    # Output
    pdf_bytes = pdf.output()
    from fastapi.responses import Response
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=batch-{batch}-report.pdf"},
    )
