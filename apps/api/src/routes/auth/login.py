"""Auth login route"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr

from ...auth.services.auth import AuthService
from ...auth.dependencies import get_auth_service

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/api/auth/login")
async def login(
    req: Request,
    data: LoginRequest,
    service: AuthService = Depends(get_auth_service),
):
    user = await service.authenticate(data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    session = await service.login(user, req.headers.get("user-agent", ""), req.client.host)
    return {
        "access_token": service.tokens.create_access_token({"sub": str(user.id), "roles": user.roles, "permissions": user.permissions}, 15),
        "refresh_token": session.refresh_token,
        "expires_in": 900,
        "user": {"id": str(user.id), "email": user.email, "roles": user.roles, "permissions": user.permissions},
    }

