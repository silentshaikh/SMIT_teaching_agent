import json
import time
import hashlib
from uuid import uuid4
from datetime import datetime

from agents import Runner
from sqlalchemy import select

from config import settings
from models.schemas import AssignmentReport, SubmissionInput
from models.db_models import StudentModel, SubmissionModel, ReportModel
from db.session import AsyncSessionLocal, init_db

from agents.code_review import code_review_agent
from agents.tutor import tutor_agent
from agents.rubric import rubric_agent
from agents.feedback import feedback_agent


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()[:16]


async def process_submission(submission_id: str, input_data: SubmissionInput) -> AssignmentReport:
    await init_db()
    start = time.monotonic()

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

    review_result = await Runner.run(
        code_review_agent,
        input=json.dumps({
            "code": input_data.code,
            "language": input_data.language,
            "student_id": input_data.student_id,
            "assignment_name": input_data.assignment_name,
        }),
    )
    cr = review_result.final_output

    tutor_result = await Runner.run(
        tutor_agent,
        input=json.dumps({
            "mistakes": [m.model_dump() for m in cr.mistakes],
            "language": input_data.language,
        }),
    )
    tr = tutor_result.final_output

    rubric_result = await Runner.run(
        rubric_agent,
        input=json.dumps({
            "code": input_data.code,
            "rubric_id": input_data.rubric_id,
            "mistakes": [m.model_dump() for m in cr.mistakes],
        }),
    )
    rr = rubric_result.final_output

    feedback_result = await Runner.run(
        feedback_agent,
        input=json.dumps({
            "student_id": input_data.student_id,
            "mistakes": [m.model_dump() for m in cr.mistakes],
            "score": rr.score,
            "grade": rr.grade,
        }),
    )
    fr = feedback_result.final_output

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
        created_at=datetime.utcnow(),
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
