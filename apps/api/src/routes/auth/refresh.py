"""Token refresh route"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ...auth.services.auth import AuthService
from ...auth.dependencies import get_auth_service
from ...auth.models.user import MongoUser

router = APIRouter()


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/api/auth/token")
async def refresh(
    data: RefreshRequest,
    service: AuthService = Depends(get_auth_service),
):
    try:
        payload = service.tokens.decode_token(data.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user_id = payload.get("sub")
    user = await MongoUser.get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = service.tokens.create_access_token({"sub": user_id, "roles": user.roles, "permissions": user.permissions}, 15)
    new_refresh = service.tokens.create_refresh_token({"sub": user_id, "roles": user.roles, "permissions": user.permissions}, 7)
    return {"access_token": access, "refresh_token": new_refresh, "expires_in": 900}

