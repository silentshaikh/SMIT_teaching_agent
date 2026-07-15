import json
import time
import hashlib
import asyncio
import logging
from uuid import uuid4
from datetime import datetime, timezone

from agents import Agent, Runner, RunConfig, ModelSettings
from agents.exceptions import ModelBehaviorError
from agents.config import get_model, PRIMARY_MODEL
from sqlalchemy import select

from config import settings
from models.schemas import AssignmentReport, SubmissionInput
from models.db_models import StudentModel, SubmissionModel, ReportModel
from db.session import AsyncSessionLocal, init_db

from agents.code_review import code_review_agent
from agents.tutor import tutor_agent
from agents.rubric import rubric_agent, _calculate_score, _grade_to_letter
from agents.feedback import feedback_agent

logger = logging.getLogger(__name__)

_MAX_RETRIES = 3
_RETRY_DELAY = 5


_RUN_CONFIG = RunConfig(model_settings=ModelSettings(max_tokens=1500))

async def _run_with_retry(agent, input_data, retries=_MAX_RETRIES):
    last_err = None
    for attempt in range(retries):
        try:
            return await Runner.run(agent, input=input_data, max_turns=20, run_config=_RUN_CONFIG)
        except (ModelBehaviorError, Exception) as e:
            last_err = e
            if attempt < retries - 1:
                logger.warning(
                    "Agent '%s' attempt %d/%d failed: %s. Retrying in %ds...",
                    agent.name, attempt + 1, retries, e, _RETRY_DELAY * (attempt + 1),
                )
                await asyncio.sleep(_RETRY_DELAY * (attempt + 1))
    raise last_err


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()[:16]


async def _mark_failed(submission_id: str, start: float):
    """Update submission status to 'failed' when the pipeline crashes."""
    elapsed = int((time.monotonic() - start) * 1000)
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(SubmissionModel).where(SubmissionModel.id == submission_id)
            )
            db_sub = result.scalar_one_or_none()
            if db_sub:
                db_sub.status = "failed"
                await session.commit()
    except Exception:
        logger.exception("Failed to mark submission %s as failed", submission_id)


async def process_submission(submission_id: str, input_data: SubmissionInput) -> AssignmentReport | None:
    await init_db()
    start = time.monotonic()

    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(StudentModel).where(StudentModel.id == input_data.student_id)
            )
            student = result.scalar_one_or_none()
            if student is None:
                student = StudentModel(
                    id=input_data.student_id,
                    name=input_data.student_id,
                    email=f"{input_data.student_id}@smit.edu",
                    batch="SMIT-Batch-42",
                )
                session.add(student)
                await session.commit()

            db_submission = SubmissionModel(
                id=submission_id,
                student_id=input_data.student_id,
                file_name=f"{input_data.assignment_name}.{input_data.language}",
                language=input_data.language,
                code_hash=_hash_code(input_data.code),
                status="processing",
            )
            session.add(db_submission)
            await session.commit()

        review_result = await _run_with_retry(
            code_review_agent,
            json.dumps({
                "code": input_data.code,
                "language": input_data.language,
                "student_id": input_data.student_id,
                "assignment_name": input_data.assignment_name,
            }),
        )
        cr = review_result.final_output

        tutor_result = await _run_with_retry(
            tutor_agent,
            json.dumps({
                "mistakes": [m.model_dump() for m in cr.mistakes],
                "language": input_data.language,
            }),
        )
        tr = tutor_result.final_output

        rubric_result = await _run_with_retry(
            rubric_agent,
            json.dumps({
                "code": input_data.code,
                "rubric_id": input_data.rubric_id,
                "mistakes": [m.model_dump() for m in cr.mistakes],
            }),
        )
        rr = rubric_result.final_output
        # Override LLM's score with deterministic calculation
        logic_count = sum(1 for m in cr.mistakes if m.type == "logic")
        rr.score = int(_calculate_score(input_data.code, input_data.rubric_id, logic_errors=logic_count))
        rr.grade = _grade_to_letter(str(rr.score))

        feedback_result = await _run_with_retry(
            feedback_agent,
            json.dumps({
                "student_id": input_data.student_id,
                "mistakes": [m.model_dump() for m in cr.mistakes],
                "score": rr.score,
                "grade": rr.grade,
            }),
        )
        fr = feedback_result.final_output

    except Exception as e:
        logger.exception("Pipeline failed for submission %s", submission_id)
        await _mark_failed(submission_id, start)
        return None

    elapsed = int((time.monotonic() - start) * 1000)

    report = AssignmentReport(
        submission_id=submission_id,
        student_id=input_data.student_id,
        assignment_name=input_data.assignment_name,
        score=rr.score,
        grade=rr.grade,
        mistakes=cr.mistakes,
        corrected_code=cr.corrected_code,
        explanation_en=tr.explanation_en,
        explanation_urdu=tr.explanation_urdu,
        suggestions=fr.suggestions,
        next_topics=fr.next_topics,
        breakdown=rr.breakdown,
        processing_time_ms=elapsed,
        created_at=datetime.now(timezone.utc),
    )

    async with AsyncSessionLocal() as session:
        db_report = ReportModel(
            id=str(uuid4()),
            submission_id=submission_id,
            score=rr.score,
            grade=rr.grade,
            report_json=report.model_dump_json(),
            processing_ms=elapsed,
        )
        session.add(db_report)

        result = await session.execute(
            select(SubmissionModel).where(SubmissionModel.id == submission_id)
        )
        db_sub = result.scalar_one()
        db_sub.status = "completed"
        await session.commit()

    return report


orchestrator_agent = Agent[None](
    name="OrchestratorAgent",
    instructions="You coordinate the code review pipeline by routing to specialized agents.",
    tools=[],
    model=get_model(PRIMARY_MODEL),
)
