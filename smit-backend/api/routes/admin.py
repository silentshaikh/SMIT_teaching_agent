from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt

from models.schemas import (
    HealthResponse, RubricCreate, Rubric, DashboardStats,
)
from models.db_models import RubricModel, SubmissionModel, ReportModel, StudentModel
from db.session import get_session
from config import settings

router = APIRouter(prefix="/api/v1", tags=["admin"])


async def verify_token(authorization: str | None = Header(None)) -> dict:
    if settings.jwt_secret == "change-me-to-a-random-secret":
        return {"sub": "dev-mode"}
    if authorization is None:
        return {"sub": "dev-mode"}
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Invalid authorization scheme")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")


@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", version="1.0.0")


@router.get("/rubrics", response_model=list[Rubric])
async def list_rubrics(
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(verify_token),
):
    result = await session.execute(select(RubricModel))
    rows = result.scalars().all()
    return [
        Rubric(
            id=r.id,
            assignment_name=r.name,
            language=r.language,
            criteria=r.criteria_json,
            max_score=r.max_score,
            created_by=r.created_by,
        )
        for r in rows
    ]


@router.post("/rubrics", response_model=Rubric, status_code=201)
async def create_rubric(
    body: RubricCreate,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(verify_token),
):
    db_rubric = RubricModel(
        name=body.name,
        language=body.language,
        criteria_json=body.criteria,
        max_score=body.max_score,
        created_by=body.created_by,
    )
    session.add(db_rubric)
    await session.commit()
    await session.refresh(db_rubric)
    return Rubric(
        id=db_rubric.id,
        assignment_name=db_rubric.name,
        language=db_rubric.language,
        criteria=db_rubric.criteria_json,
        max_score=db_rubric.max_score,
        created_by=db_rubric.created_by,
    )


@router.get("/dashboard/{batch}", response_model=DashboardStats)
async def dashboard(
    batch: str,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(verify_token),
):
    student_count_result = await session.execute(
        select(func.count(StudentModel.id)).where(StudentModel.batch == batch)
    )
    total_students = student_count_result.scalar() or 0

    submission_count_result = await session.execute(
        select(func.count(SubmissionModel.id))
        .select_from(SubmissionModel)
        .join(StudentModel)
        .where(StudentModel.batch == batch)
    )
    total_submissions = submission_count_result.scalar() or 0

    avg_result = await session.execute(
        select(func.avg(ReportModel.score))
        .select_from(ReportModel)
        .join(SubmissionModel)
        .join(StudentModel)
        .where(StudentModel.batch == batch)
    )
    avg_score = avg_result.scalar() or 0.0

    grades = ["A", "B", "C", "D", "F"]
    grade_dist = {}
    for grade in grades:
        grade_count = await session.execute(
            select(func.count(ReportModel.id))
            .select_from(ReportModel)
            .join(SubmissionModel)
            .join(StudentModel)
            .where(StudentModel.batch == batch, ReportModel.grade == grade)
        )
        grade_dist[grade] = grade_count.scalar() or 0

    return DashboardStats(
        batch=batch,
        total_students=total_students,
        total_submissions=total_submissions,
        average_score=round(float(avg_score), 1),
        grade_distribution=grade_dist,
    )
