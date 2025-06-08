"""Authentication service"""
from datetime import datetime, timedelta
from typing import Optional

from passlib.context import CryptContext

from ..models.user import MongoUser
from ..models.session import Session
from .token import TokenService


class AuthService:
    """Basic auth logic for FARM"""

    def __init__(self, secret: str) -> None:
        self.pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.tokens = TokenService(secret)

    async def register(self, email: str, password: str) -> MongoUser:
        existing = await MongoUser.find_one(MongoUser.email == email)
        if existing:
            raise ValueError("User exists")
        user = MongoUser(email=email, password_hash=self.pwd.hash(password))
        await user.insert()
        return user

    async def authenticate(self, email: str, password: str) -> Optional[MongoUser]:
        user = await MongoUser.find_one(MongoUser.email == email)
        if not user:
            return None
        if not self.pwd.verify(password, user.password_hash):
            return None
        return user

    async def login(self, user: MongoUser, user_agent: str, ip: str) -> Session:
        payload = {"sub": str(user.id), "roles": user.roles, "permissions": user.permissions}
        access = self.tokens.create_access_token(payload, 15)
        refresh = self.tokens.create_refresh_token(payload, 7)
        session = Session(
            user_id=str(user.id),
            refresh_token=refresh,
            user_agent=user_agent,
            ip_address=ip,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        await session.insert()
        return session

