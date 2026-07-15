from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import AssignmentReport, HistoryItem
from models.db_models import SubmissionModel, ReportModel
from db.session import get_session
from api.routes.admin import verify_token

router = APIRouter(prefix="/api/v1", tags=["reports"])


async def get_report_from_store(submission_id: str, session: AsyncSession) -> dict | None:
    """Fetch report dict from DB. Extracted for testability."""
    result = await session.execute(
        select(SubmissionModel).where(SubmissionModel.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if submission is None:
        return None

    if submission.status != "completed":
        return {"submission_id": submission_id, "status": submission.status}

    result = await session.execute(
        select(ReportModel).where(ReportModel.submission_id == submission_id)
    )
    report = result.scalar_one_or_none()
    if report is None:
        return None

    return AssignmentReport.model_validate_json(report.report_json).model_dump(mode="json")


@router.get("/report/{submission_id}")
async def get_report(
    submission_id: str,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(verify_token),
):
    data = await get_report_from_store(submission_id, session)
    if data is None:
        raise HTTPException(404, "Submission not found")
    return data


@router.get("/history/{student_id}")
async def get_history(
    student_id: str,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(verify_token),
):
    result = await session.execute(
        select(SubmissionModel, ReportModel)
        .outerjoin(ReportModel, SubmissionModel.id == ReportModel.submission_id)
        .where(SubmissionModel.student_id == student_id)
        .order_by(SubmissionModel.created_at.desc())
    )
    rows = result.all()
    items = []
    for sub, rep in rows:
        items.append(
            HistoryItem(
                submission_id=sub.id,
                assignment_name=sub.file_name.replace(f".{sub.language}", ""),
                language=sub.language,
                score=rep.score if rep else None,
                grade=rep.grade if rep else None,
                status=sub.status,
                created_at=sub.created_at,
            )
        )
    return items


@router.get("/report/{submission_id}/download")
async def download_report(
    submission_id: str,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(verify_token),
):
    result = await session.execute(
        select(ReportModel).where(ReportModel.submission_id == submission_id)
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(404, "Report not found")

    from fastapi.responses import JSONResponse
    return JSONResponse(
        content=AssignmentReport.model_validate_json(report.report_json).model_dump(mode="json"),
        headers={"Content-Disposition": f"attachment; filename=report-{submission_id}.json"},
    )
