from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Header
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import LoginRequest, LoginResponse, RegisterRequest
from models.db_models import StudentModel, TeacherModel
from db.session import get_session
from config import settings

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: str, role: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


async def verify_token(authorization: str | None = Header(None)) -> dict:
    # Dev mode bypass: only when explicitly enabled AND no token provided
    if settings.dev_mode and authorization is None:
        return {"sub": "dev-mode", "role": "teacher"}
    if authorization is None:
        raise HTTPException(401, "Missing authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Invalid authorization scheme")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_session)):
    # Try student login first
    result = await session.execute(
        select(StudentModel).where(StudentModel.email == body.email)
    )
    student = result.scalar_one_or_none()
    if student:
        if not student.password_hash or not verify_password(body.password, student.password_hash):
            raise HTTPException(401, "Invalid email or password")
        token = create_token(student.id, "student", student.email)
        return LoginResponse(token=token, role="student", user_id=student.id, name=student.name)

    # Try teacher login
    result = await session.execute(
        select(TeacherModel).where(TeacherModel.email == body.email)
    )
    teacher = result.scalar_one_or_none()
    if teacher:
        if not teacher.password_hash or not verify_password(body.password, teacher.password_hash):
            raise HTTPException(401, "Invalid email or password")
        token = create_token(teacher.id, "teacher", teacher.email)
        return LoginResponse(token=token, role="teacher", user_id=teacher.id, name=teacher.name)

    raise HTTPException(401, "Invalid email or password")


@router.post("/register", response_model=LoginResponse)
async def register(body: RegisterRequest, session: AsyncSession = Depends(get_session)):
    if body.role == "student" and not body.batch:
        raise HTTPException(422, "Batch is required for students")

    existing = await session.execute(
        select(StudentModel).where(StudentModel.email == body.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Email already registered")

    existing = await session.execute(
        select(TeacherModel).where(TeacherModel.email == body.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Email already registered")

    hashed = hash_password(body.password)

    if body.role == "teacher":
        user = TeacherModel(
            name=body.name,
            email=body.email,
            password_hash=hashed,
        )
    else:
        user = StudentModel(
            name=body.name,
            email=body.email,
            password_hash=hashed,
            batch=body.batch,
        )

    session.add(user)
    await session.commit()
    await session.refresh(user)
    token = create_token(user.id, body.role, user.email)
    return LoginResponse(token=token, role=body.role, user_id=user.id, name=user.name)
