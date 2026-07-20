"""Shared auth dependencies for route protection."""

from fastapi import Depends, HTTPException, Header

from api.routes.auth import verify_token


async def require_teacher(authorization: str | None = Header(None)) -> dict:
    """Verify token AND require teacher role. Rejects students."""
    user = await verify_token(authorization)
    if user.get("role") != "teacher":
        raise HTTPException(403, "Teacher access required")
    return user
