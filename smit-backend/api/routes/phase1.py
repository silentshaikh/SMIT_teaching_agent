"""Phase 1 student endpoints: progress, Q&A, reverify, badges."""

import json
import logging
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import (
    StudentProgress, ProgressPoint, MistakeFrequency,
    QARequest, QAResponse,
    ReverifyRequest, ReverifyResponse,
    Badge,
    AssignmentReport,
)
from models.db_models import SubmissionModel, ReportModel
from db.session import get_session
from db.qa_store import qa_store
from api.routes.auth import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["phase1"])


# ── 1.1 Progress tracking ───────────────────────────

@router.get("/students/{student_id}/progress", response_model=StudentProgress)
async def get_student_progress(
    student_id: str,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(verify_token),
):
    if user.get("role") == "student" and user.get("sub") != student_id:
        raise HTTPException(403, "Cannot view other students' progress")
    result = await session.execute(
        select(SubmissionModel, ReportModel)
        .outerjoin(ReportModel, SubmissionModel.id == ReportModel.submission_id)
        .where(
            SubmissionModel.student_id == student_id,
            SubmissionModel.status == "completed",
        )
        .order_by(SubmissionModel.created_at.asc())
    )
    rows = result.all()

    time_series = []
    mistake_counter: Counter[str] = Counter()

    for sub, rep in rows:
        time_series.append(
            ProgressPoint(
                submission_id=sub.id,
                created_at=sub.created_at,
                score=rep.score if rep else None,
                grade=rep.grade if rep else None,
            )
        )
        if rep:
            try:
                report_data = json.loads(rep.report_json)
                for m in report_data.get("mistakes", []):
                    mistake_counter[m.get("type", "unknown")] += 1
            except (json.JSONDecodeError, KeyError):
                pass

    return StudentProgress(
        student_id=student_id,
        time_series=time_series,
        mistake_type_frequency=[
            MistakeFrequency(type=t, count=c)
            for t, c in mistake_counter.most_common()
        ],
    )


# ── 1.2 Follow-up Q&A ──────────────────────────────

@router.post("/report/{submission_id}/ask", response_model=QAResponse)
async def ask_question(
    submission_id: str,
    body: QARequest,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(verify_token),
):
    # Fetch the report to get mistakes
    result = await session.execute(
        select(ReportModel).where(ReportModel.submission_id == submission_id)
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(404, "Report not found")

    try:
        report_data = json.loads(report.report_json)
    except json.JSONDecodeError:
        raise HTTPException(500, "Corrupt report data")

    mistakes = report_data.get("mistakes", [])

    # Run tutor agent with mistakes + question
    from agents.tutor import tutor_agent
    from agents.config import get_model, PRIMARY_MODEL
    from agents import Runner, RunConfig, ModelSettings

    tutor_input = json.dumps({
        "mistakes": mistakes,
        "question": body.question,
        "context": "Student is asking a follow-up question about their code review report.",
    })

    try:
        result = await Runner.run(
            tutor_agent,
            input=tutor_input,
            max_turns=20,
            run_config=RunConfig(model_settings=ModelSettings(max_tokens=800)),
        )
        tutor_output = result.final_output
    except Exception:
        logger.exception("Tutor agent failed for Q&A")
        raise HTTPException(502, "Tutor agent unavailable")

    pair = await qa_store.add(
        submission_id,
        body.question,
        tutor_output.explanation_en,
        tutor_output.explanation_urdu,
    )

    return QAResponse(**pair)


@router.get("/report/{submission_id}/qa", response_model=list[QAResponse])
async def get_qa_history(
    submission_id: str,
    _: dict = Depends(verify_token),
):
    pairs = await qa_store.get(submission_id)
    return [QAResponse(**p) for p in pairs]


# ── 1.3 Reverify a single mistake ───────────────────

@router.post("/mistakes/{mistake_id}/reverify", response_model=ReverifyResponse)
async def reverify_mistake(
    mistake_id: str,
    body: ReverifyRequest,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(verify_token),
):
    # Find the report containing this mistake
    result = await session.execute(select(ReportModel))
    reports = result.scalars().all()

    target_report = None
    target_mistake = None
    for rep in reports:
        try:
            data = json.loads(rep.report_json)
            for m in data.get("mistakes", []):
                if m.get("id") == mistake_id:
                    target_report = data
                    target_mistake = m
                    break
        except (json.JSONDecodeError, KeyError):
            continue

    if target_mistake is None:
        raise HTTPException(404, "Mistake not found")

    # Run a single-mistake check using code_review agent
    from agents.code_review import code_review_agent
    from agents import Runner, RunConfig, ModelSettings

    review_input = json.dumps({
        "code": body.corrected_snippet,
        "language": target_report.get("mistakes", [{}])[0].get("language", "python") if target_report.get("mistakes") else "python",
        "focus": f"Check if this code fixes the following mistake: {target_mistake.get('description', '')}",
    })

    try:
        result = await Runner.run(
            code_review_agent,
            input=review_input,
            max_turns=20,
            run_config=RunConfig(model_settings=ModelSettings(max_tokens=800)),
        )
        cr = result.final_output
        passed = len(cr.mistakes) == 0
        note = "No issues found — looks correct!" if passed else f"Still has {len(cr.mistakes)} issue(s): {cr.mistakes[0].description}"
    except Exception:
        logger.exception("Code review agent failed for reverify")
        raise HTTPException(502, "Review agent unavailable")

    return ReverifyResponse(passed=passed, note=note)


# ── 1.5 Badges ──────────────────────────────────────

@router.get("/students/{student_id}/badges", response_model=list[Badge])
async def get_student_badges(
    student_id: str,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(verify_token),
):
    if user.get("role") == "student" and user.get("sub") != student_id:
        raise HTTPException(403, "Cannot view other students' badges")
    result = await session.execute(
        select(SubmissionModel, ReportModel)
        .outerjoin(ReportModel, SubmissionModel.id == ReportModel.submission_id)
        .where(
            SubmissionModel.student_id == student_id,
            SubmissionModel.status == "completed",
        )
        .order_by(SubmissionModel.created_at.asc())
    )
    rows = result.all()

    total = len(rows)
    syntax_zero_count = 0
    logic_zero_count = 0
    streak = 0
    max_streak = 0

    for sub, rep in rows:
        if rep:
            try:
                data = json.loads(rep.report_json)
                mistakes = data.get("mistakes", [])
                syntax_count = sum(1 for m in mistakes if m.get("type") == "syntax")
                logic_count = sum(1 for m in mistakes if m.get("type") == "logic")
                if syntax_count == 0:
                    syntax_zero_count += 1
                if logic_count == 0:
                    logic_zero_count += 1
            except (json.JSONDecodeError, KeyError):
                pass

    # Simple streak: consecutive submissions with improving or stable scores
    scores = [rep.score for _, rep in rows if rep and rep.score is not None]
    if len(scores) >= 2:
        streak = 1
        for i in range(1, len(scores)):
            if scores[i] >= scores[i - 1]:
                streak += 1
            else:
                streak = 1
            max_streak = max(max_streak, streak)
        max_streak = max(max_streak, streak)

    badges = [
        Badge(
            id="first-submission",
            name="First Submission",
            description="Submitted your first assignment",
            earned=total >= 1,
        ),
        Badge(
            id="five-submissions",
            name="Persistent Learner",
            description="Submitted 5 assignments",
            earned=total >= 5,
        ),
        Badge(
            id="ten-submissions",
            name="Code Marathon",
            description="Submitted 10 assignments",
            earned=total >= 10,
        ),
        Badge(
            id="zero-syntax-3",
            name="Syntax Master",
            description="3 submissions with zero syntax errors",
            earned=syntax_zero_count >= 3,
        ),
        Badge(
            id="zero-logic-3",
            name="Logic Guru",
            description="3 submissions with zero logic errors",
            earned=logic_zero_count >= 3,
        ),
        Badge(
            id="streak-3",
            name="Improving Streak",
            description="3 consecutive submissions with improving scores",
            earned=max_streak >= 3,
        ),
    ]

    return badges
