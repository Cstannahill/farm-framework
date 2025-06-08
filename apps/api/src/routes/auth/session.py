"""Session info route"""
from fastapi import APIRouter, Depends, HTTPException, Request

from ...auth.services.auth import AuthService
from ...auth.dependencies import get_auth_service
from ...auth.models.user import MongoUser

router = APIRouter()


@router.get("/api/auth/session")
async def get_session(
    req: Request,
    service: AuthService = Depends(get_auth_service),
):
    token = req.headers.get("authorization")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Auth required")
    payload = service.tokens.decode_token(token.split()[1])
    user_id = payload.get("sub")
    user = await MongoUser.get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    return {"user": {"id": str(user.id), "email": user.email, "roles": user.roles, "permissions": user.permissions}}


