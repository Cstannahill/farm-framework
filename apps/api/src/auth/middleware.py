"""Authentication middleware"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from .dependencies import get_auth_service


class AuthMiddleware(BaseHTTPMiddleware):
    """Attach user to request if bearer token is valid"""

    def __init__(self, app) -> None:
        super().__init__(app)
        self.service = get_auth_service()

    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split()[1]
            try:
                payload = self.service.tokens.decode_token(token)
                request.state.user_id = payload.get("sub")
            except Exception:
                raise HTTPException(status_code=401, detail="Invalid token")
        return await call_next(request)

