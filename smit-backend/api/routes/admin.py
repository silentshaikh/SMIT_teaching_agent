from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import (
    HealthResponse, RubricCreate, Rubric, RubricVersion, DashboardStats, CourseStats,
    Course, Assignment,
)
from models.db_models import (
    RubricModel, RubricVersionModel, SubmissionModel, ReportModel,
    StudentModel, CourseModel, AssignmentModel,
)
from db.session import get_session
from api.dependencies import require_teacher

router = APIRouter(prefix="/api/v1", tags=["admin"])


@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", version="1.0.0")


# ── Courses ─────────────────────────────────────────

@router.get("/courses", response_model=list[Course])
async def list_courses(
    batch: str | None = None,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(require_teacher),
):
    q = select(CourseModel)
    if batch:
        q = q.where(CourseModel.batch == batch)
    result = await session.execute(q)
    rows = result.scalars().all()
    return [
        Course(id=c.id, name=c.name, batch=c.batch, created_at=c.created_at)
        for c in rows
    ]


@router.post("/courses", response_model=Course, status_code=201)
async def create_course(
    body: dict,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(require_teacher),
):
    db_course = CourseModel(name=body["name"], batch=body["batch"])
    session.add(db_course)
    await session.commit()
    await session.refresh(db_course)
    return Course(id=db_course.id, name=db_course.name, batch=db_course.batch, created_at=db_course.created_at)


# ── Assignments ─────────────────────────────────────

@router.get("/assignments", response_model=list[Assignment])
async def list_assignments(
    course_id: str | None = None,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(require_teacher),
):
    q = select(AssignmentModel)
    if course_id:
        q = q.where(AssignmentModel.course_id == course_id)
    result = await session.execute(q)
    rows = result.scalars().all()
    return [
        Assignment(
            id=a.id, course_id=a.course_id, name=a.name,
            rubric_id=a.rubric_id, due_date=a.due_date, created_at=a.created_at,
        )
        for a in rows
    ]


@router.post("/assignments", response_model=Assignment, status_code=201)
async def create_assignment(
    body: dict,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(require_teacher),
):
    db_assignment = AssignmentModel(
        course_id=body["course_id"],
        name=body["name"],
        rubric_id=body.get("rubric_id"),
        due_date=body.get("due_date"),
    )
    session.add(db_assignment)
    await session.commit()
    await session.refresh(db_assignment)
    return Assignment(
        id=db_assignment.id, course_id=db_assignment.course_id,
        name=db_assignment.name, rubric_id=db_assignment.rubric_id,
        due_date=db_assignment.due_date, created_at=db_assignment.created_at,
    )


# ── Rubrics (with versioning) ───────────────────────

@router.get("/rubrics", response_model=list[Rubric])
async def list_rubrics(
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(require_teacher),
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
    _: dict = Depends(require_teacher),
):
    db_rubric = RubricModel(
        name=body.name,
        language=body.language,
        criteria_json=body.criteria,
        max_score=body.max_score,
        created_by=body.created_by,
    )
    session.add(db_rubric)
    await session.flush()

    # Create initial version
    version = RubricVersionModel(
        rubric_id=db_rubric.id,
        version_number=1,
        criteria_json=body.criteria,
        max_score=body.max_score,
        created_by=body.created_by,
    )
    session.add(version)
    await session.flush()

    db_rubric.current_version_id = version.id
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


@router.put("/rubrics/{rubric_id}", response_model=Rubric)
async def update_rubric(
    rubric_id: str,
    body: RubricCreate,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(require_teacher),
):
    result = await session.execute(select(RubricModel).where(RubricModel.id == rubric_id))
    db_rubric = result.scalar_one_or_none()
    if db_rubric is None:
        raise HTTPException(404, "Rubric not found")

    # Get latest version number
    ver_result = await session.execute(
        select(RubricVersionModel)
        .where(RubricVersionModel.rubric_id == rubric_id)
        .order_by(RubricVersionModel.version_number.desc())
        .limit(1)
    )
    latest_ver = ver_result.scalar_one_or_none()
    next_version = (latest_ver.version_number + 1) if latest_ver else 1

    # Create new version
    version = RubricVersionModel(
        rubric_id=rubric_id,
        version_number=next_version,
        criteria_json=body.criteria,
        max_score=body.max_score,
        created_by=body.created_by,
    )
    session.add(version)
    await session.flush()

    # Update head pointer
    db_rubric.name = body.name
    db_rubric.language = body.language
    db_rubric.criteria_json = body.criteria
    db_rubric.max_score = body.max_score
    db_rubric.current_version_id = version.id
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


@router.get("/rubrics/{rubric_id}/versions", response_model=list[RubricVersion])
async def list_rubric_versions(
    rubric_id: str,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(require_teacher),
):
    result = await session.execute(
        select(RubricVersionModel)
        .where(RubricVersionModel.rubric_id == rubric_id)
        .order_by(RubricVersionModel.version_number.desc())
    )
    rows = result.scalars().all()
    return [
        RubricVersion(
            id=v.id, rubric_id=v.rubric_id, version_number=v.version_number,
            criteria=v.criteria_json, max_score=v.max_score,
            created_by=v.created_by, created_at=v.created_at,
        )
        for v in rows
    ]


@router.get("/rubrics/{rubric_id}/compare")
async def compare_rubric_versions(
    rubric_id: str,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(require_teacher),
):
    """Compare average scores across rubric versions."""
    ver_result = await session.execute(
        select(RubricVersionModel)
        .where(RubricVersionModel.rubric_id == rubric_id)
        .order_by(RubricVersionModel.version_number.asc())
    )
    versions = ver_result.scalars().all()

    comparison = []
    for v in versions:
        avg_result = await session.execute(
            select(func.avg(ReportModel.score))
            .select_from(ReportModel)
            .join(SubmissionModel, ReportModel.submission_id == SubmissionModel.id)
            .where(SubmissionModel.rubric_version_id == v.id)
        )
        avg = avg_result.scalar()
        count_result = await session.execute(
            select(func.count(SubmissionModel.id))
            .where(SubmissionModel.rubric_version_id == v.id)
        )
        count = count_result.scalar() or 0
        comparison.append({
            "version_id": v.id,
            "version_number": v.version_number,
            "created_by": v.created_by,
            "created_at": v.created_at.isoformat(),
            "average_score": round(float(avg or 0.0), 1),
            "submission_count": count,
        })

    return comparison


# ── Dashboard ───────────────────────────────────────

@router.get("/dashboard/{batch}", response_model=DashboardStats)
async def dashboard(
    batch: str,
    session: AsyncSession = Depends(get_session),
    _: dict = Depends(require_teacher),
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

    # Per-course breakdown
    courses_result = await session.execute(
        select(CourseModel.id, CourseModel.name)
        .where(CourseModel.batch == batch)
    )
    courses_rows = courses_result.all()
    courses_data = []
    for c_id, c_name in courses_rows:
        sub_count_result = await session.execute(
            select(func.count(SubmissionModel.id))
            .select_from(SubmissionModel)
            .join(AssignmentModel, SubmissionModel.assignment_id == AssignmentModel.id)
            .where(AssignmentModel.course_id == c_id)
        )
        c_sub_count = sub_count_result.scalar() or 0
        c_avg_result = await session.execute(
            select(func.avg(ReportModel.score))
            .select_from(ReportModel)
            .join(SubmissionModel, ReportModel.submission_id == SubmissionModel.id)
            .join(AssignmentModel, SubmissionModel.assignment_id == AssignmentModel.id)
            .where(AssignmentModel.course_id == c_id)
        )
        c_avg = c_avg_result.scalar()
        courses_data.append((c_id, c_name, c_sub_count, c_avg))

    return DashboardStats(
        batch=batch,
        total_students=total_students,
        total_submissions=total_submissions,
        average_score=round(float(avg_score), 1),
        grade_distribution=grade_dist,
        courses=[
            CourseStats(
                course_id=c_id,
                course_name=c_name,
                total_submissions=c_sub_count,
                average_score=round(float(c_avg or 0.0), 1),
            )
            for c_id, c_name, c_sub_count, c_avg in courses_data
        ],
    )
