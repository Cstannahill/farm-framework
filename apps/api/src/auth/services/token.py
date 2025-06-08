"""JWT token utilities"""
from datetime import datetime, timedelta
from typing import Dict

from jose import jwt


class TokenService:
    """Handle issuing and verifying JWT tokens"""

    def __init__(self, secret: str, algorithm: str = "HS256") -> None:
        self.secret = secret
        self.algorithm = algorithm

    def create_access_token(self, payload: Dict[str, object], expires_minutes: int) -> str:
        expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
        to_encode = payload.copy()
        to_encode.update({"exp": expire, "iat": datetime.utcnow(), "type": "access"})
        return jwt.encode(to_encode, self.secret, algorithm=self.algorithm)

    def create_refresh_token(self, payload: Dict[str, object], expires_days: int) -> str:
        expire = datetime.utcnow() + timedelta(days=expires_days)
        to_encode = payload.copy()
        to_encode.update({"exp": expire, "iat": datetime.utcnow(), "type": "refresh"})
        return jwt.encode(to_encode, self.secret, algorithm=self.algorithm)

    def decode_token(self, token: str) -> Dict[str, object]:
        return jwt.decode(token, self.secret, algorithms=[self.algorithm])

