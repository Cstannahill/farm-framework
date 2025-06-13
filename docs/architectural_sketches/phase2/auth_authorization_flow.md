# Authentication & Authorization Flow

## Overview

The FARM authentication system provides a comprehensive, plugin-based auth solution with JWT tokens, OAuth providers, role-based access control (RBAC), and seamless integration with the AI provider system. It supports both built-in auth patterns and extensible custom authentication flows while maintaining type safety across the full stack.

---

## High-Level Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FARM Authentication Layer                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │    JWT      │  │   OAuth     │  │    SAML     │  │ Custom  │ │
│  │  Provider   │  │ Providers   │  │  Provider   │  │Provider │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │    User     │  │    Role     │  │ Permission  │  │ Session │ │
│  │ Management  │  │ Management  │  │  Manager    │  │ Manager │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Auth        │  │   Route     │  │     API     │  │   AI    │ │
│  │Middleware   │  │ Protection  │  │ Protection  │  │ Context │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Authentication Models

### 1. User Model with Comprehensive Auth Data

**Enhanced User Model with Auth Context:**

```python
# apps/api/src/auth/models/user.py
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from beanie import Document, Indexed
from pydantic import BaseModel, Field, EmailStr
from enum import Enum

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"

class AuthProvider(str, Enum):
    LOCAL = "local"
    GOOGLE = "google"
    GITHUB = "github"
    MICROSOFT = "microsoft"
    APPLE = "apple"
    SAML = "saml"

class TwoFactorMethod(str, Enum):
    NONE = "none"
    SMS = "sms"
    EMAIL = "email"
    AUTHENTICATOR = "authenticator"
    WEBAUTHN = "webauthn"

class UserProfile(BaseModel):
    """User profile information"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    timezone: str = "UTC"
    locale: str = "en"
    preferences: Dict[str, Any] = Field(default_factory=dict)

class AuthMetadata(BaseModel):
    """Authentication metadata"""
    provider: AuthProvider = AuthProvider.LOCAL
    provider_id: Optional[str] = None
    provider_data: Dict[str, Any] = Field(default_factory=dict)
    two_factor_method: TwoFactorMethod = TwoFactorMethod.NONE
    two_factor_backup_codes: List[str] = Field(default_factory=list)
    password_changed_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    login_count: int = 0
    failed_login_attempts: int = 0
    account_locked_until: Optional[datetime] = None

class User(Document):
    """Comprehensive user model with auth integration"""

    # Core identity
    email: Indexed(EmailStr, unique=True)
    username: Optional[Indexed(str, unique=True)] = None
    password_hash: Optional[str] = None

    # Profile information
    profile: UserProfile = Field(default_factory=UserProfile)

    # Authentication metadata
    auth: AuthMetadata = Field(default_factory=AuthMetadata)

    # Status and verification
    status: UserStatus = UserStatus.PENDING_VERIFICATION
    email_verified: bool = False
    email_verification_token: Optional[str] = None
    password_reset_token: Optional[str] = None
    password_reset_expires: Optional[datetime] = None

    # Role-based access control
    roles: List[str] = Field(default_factory=list)
    permissions: List[str] = Field(default_factory=list)

    # AI context (for personalized AI interactions)
    ai_context: Dict[str, Any] = Field(default_factory=dict)
    ai_preferences: Dict[str, Any] = Field(default_factory=dict)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active_at: Optional[datetime] = None

    class Settings:
        collection = "users"
        indexes = [
            "email",
            "username",
            "status",
            "roles",
            "auth.provider",
            "created_at",
            "last_active_at"
        ]

    def has_role(self, role: str) -> bool:
        """Check if user has specific role"""
        return role in self.roles

    def has_permission(self, permission: str) -> bool:
        """Check if user has specific permission"""
        return permission in self.permissions

    def add_role(self, role: str) -> None:
        """Add role to user"""
        if role not in self.roles:
            self.roles.append(role)

    def remove_role(self, role: str) -> None:
        """Remove role from user"""
        if role in self.roles:
            self.roles.remove(role)

    def is_locked(self) -> bool:
        """Check if account is locked"""
        if not self.auth.account_locked_until:
            return False
        return datetime.now(timezone.utc) < self.auth.account_locked_until

    def can_login(self) -> bool:
        """Check if user can login"""
        return (
            self.status == UserStatus.ACTIVE and
            not self.is_locked() and
            self.email_verified
        )

    async def update_login_info(self) -> None:
        """Update login metadata"""
        now = datetime.now(timezone.utc)
        self.auth.last_login_at = now
        self.auth.login_count += 1
        self.auth.failed_login_attempts = 0
        self.last_active_at = now
        await self.save()

    async def record_failed_login(self) -> None:
        """Record failed login attempt"""
        self.auth.failed_login_attempts += 1

        # Lock account after 5 failed attempts
        if self.auth.failed_login_attempts >= 5:
            self.auth.account_locked_until = (
                datetime.now(timezone.utc) + timedelta(minutes=30)
            )

        await self.save()
```

### 2. Role and Permission Models

**Flexible RBAC System:**

```python
# apps/api/src/auth/models/rbac.py
from typing import List, Optional, Dict, Any
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class Permission(Document):
    """System permissions"""

    name: Indexed(str, unique=True)
    description: str
    category: str  # e.g., "user", "ai", "admin", "api"
    resource: Optional[str] = None  # Specific resource this applies to
    actions: List[str] = Field(default_factory=list)  # CRUD operations

    # AI-specific permissions
    ai_providers: List[str] = Field(default_factory=list)  # Which AI providers
    ai_models: List[str] = Field(default_factory=list)     # Which models
    ai_rate_limits: Dict[str, int] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        collection = "permissions"
        indexes = ["name", "category", "resource"]

class Role(Document):
    """User roles with permissions"""

    name: Indexed(str, unique=True)
    description: str
    permissions: List[str] = Field(default_factory=list)  # Permission names

    # Role hierarchy
    parent_roles: List[str] = Field(default_factory=list)
    child_roles: List[str] = Field(default_factory=list)

    # AI-specific role configuration
    ai_access_level: str = "basic"  # basic, advanced, admin
    ai_daily_quota: Optional[int] = None  # Daily AI request quota
    ai_monthly_quota: Optional[int] = None  # Monthly AI request quota

    # Role metadata
    is_system_role: bool = False  # Cannot be deleted
    is_default: bool = False      # Assigned to new users

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        collection = "roles"
        indexes = ["name", "is_system_role", "is_default"]

    async def get_all_permissions(self) -> List[str]:
        """Get all permissions including inherited from parent roles"""
        all_permissions = set(self.permissions)

        # Add permissions from parent roles
        for parent_role_name in self.parent_roles:
            parent_role = await Role.find_one(Role.name == parent_role_name)
            if parent_role:
                parent_permissions = await parent_role.get_all_permissions()
                all_permissions.update(parent_permissions)

        return list(all_permissions)

# Default system roles and permissions
SYSTEM_PERMISSIONS = [
    Permission(
        name="user.read",
        description="Read user information",
        category="user",
        resource="user",
        actions=["read"]
    ),
    Permission(
        name="user.write",
        description="Create and update users",
        category="user",
        resource="user",
        actions=["create", "update"]
    ),
    Permission(
        name="ai.basic",
        description="Basic AI access",
        category="ai",
        ai_providers=["ollama", "openai"],
        ai_models=["llama3.1", "gpt-3.5-turbo"],
        ai_rate_limits={"requests_per_hour": 100}
    ),
    Permission(
        name="ai.advanced",
        description="Advanced AI access",
        category="ai",
        ai_providers=["ollama", "openai", "huggingface"],
        ai_models=["llama3.1", "gpt-4", "claude-3"],
        ai_rate_limits={"requests_per_hour": 1000}
    ),
    Permission(
        name="admin.full",
        description="Full administrative access",
        category="admin",
        actions=["create", "read", "update", "delete"]
    )
]

SYSTEM_ROLES = [
    Role(
        name="user",
        description="Default user role",
        permissions=["user.read", "ai.basic"],
        is_system_role=True,
        is_default=True,
        ai_access_level="basic",
        ai_daily_quota=100
    ),
    Role(
        name="premium_user",
        description="Premium user with enhanced AI access",
        permissions=["user.read", "user.write", "ai.advanced"],
        is_system_role=True,
        ai_access_level="advanced",
        ai_daily_quota=1000
    ),
    Role(
        name="admin",
        description="System administrator",
        permissions=["user.read", "user.write", "ai.advanced", "admin.full"],
        is_system_role=True,
        ai_access_level="admin",
        ai_daily_quota=None  # Unlimited
    )
]
```

---

## Authentication Service Layer

### 1. Core Authentication Service

**Comprehensive Authentication Logic:**

```python
# apps/api/src/auth/services/auth_service.py
from typing import Optional, Tuple, Dict, Any
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
import secrets
import hashlib

from ..models.user import User, UserStatus, AuthProvider
from ..models.rbac import Role, Permission
from .email_service import EmailService
from .oauth_service import OAuthService
from ..exceptions import AuthenticationError, AuthorizationError

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False
    two_factor_code: Optional[str] = None

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]

class AuthService:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.email_service = EmailService(config.get("email", {}))
        self.oauth_service = OAuthService(config.get("oauth", {}))

        # JWT configuration
        self.jwt_secret = config["jwt"]["secret"]
        self.jwt_algorithm = config["jwt"].get("algorithm", "HS256")
        self.access_token_expire = config["jwt"].get("access_token_expire", 15)  # minutes
        self.refresh_token_expire = config["jwt"].get("refresh_token_expire", 7)  # days

    async def register(self, request: RegisterRequest) -> User:
        """Register new user"""

        # Check if user already exists
        existing_user = await User.find_one(User.email == request.email)
        if existing_user:
            raise AuthenticationError("User with this email already exists")

        if request.username:
            existing_username = await User.find_one(User.username == request.username)
            if existing_username:
                raise AuthenticationError("Username already taken")

        # Create user
        user = User(
            email=request.email,
            username=request.username,
            password_hash=self.hash_password(request.password),
            status=UserStatus.PENDING_VERIFICATION,
            email_verification_token=self.generate_verification_token()
        )

        # Set profile information
        if request.first_name:
            user.profile.first_name = request.first_name
        if request.last_name:
            user.profile.last_name = request.last_name

        # Assign default role
        default_role = await Role.find_one(Role.is_default == True)
        if default_role:
            user.roles.append(default_role.name)

        await user.save()

        # Send verification email
        await self.send_verification_email(user)

        return user

    async def login(self, request: LoginRequest) -> TokenResponse:
        """Authenticate user and return tokens"""

        # Find user
        user = await User.find_one(User.email == request.email)
        if not user:
            raise AuthenticationError("Invalid email or password")

        # Check if account can login
        if not user.can_login():
            if user.is_locked():
                raise AuthenticationError("Account is temporarily locked")
            elif user.status != UserStatus.ACTIVE:
                raise AuthenticationError("Account is not active")
            elif not user.email_verified:
                raise AuthenticationError("Email not verified")

        # Verify password
        if not self.verify_password(request.password, user.password_hash):
            await user.record_failed_login()
            raise AuthenticationError("Invalid email or password")

        # Check two-factor authentication
        if user.auth.two_factor_method != "none" and not request.two_factor_code:
            raise AuthenticationError("Two-factor authentication required")

        if request.two_factor_code:
            if not await self.verify_two_factor(user, request.two_factor_code):
                raise AuthenticationError("Invalid two-factor code")

        # Update login info
        await user.update_login_info()

        # Generate tokens
        access_token = self.create_access_token(user, request.remember_me)
        refresh_token = self.create_refresh_token(user)

        # Prepare user data for response
        user_data = {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "profile": user.profile.dict(),
            "roles": user.roles,
            "permissions": await self.get_user_permissions(user),
            "ai_access_level": await self.get_user_ai_access_level(user)
        }

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self.access_token_expire * 60,
            user=user_data
        )

    async def oauth_login(self, provider: str, code: str, redirect_uri: str) -> TokenResponse:
        """OAuth authentication flow"""

        # Exchange code for user info
        oauth_user = await self.oauth_service.get_user_info(provider, code, redirect_uri)

        # Find or create user
        user = await User.find_one(
            User.auth.provider == provider,
            User.auth.provider_id == oauth_user.id
        )

        if not user:
            # Create new user from OAuth data
            user = User(
                email=oauth_user.email,
                username=oauth_user.username,
                status=UserStatus.ACTIVE,
                email_verified=True
            )

            # Set OAuth metadata
            user.auth.provider = AuthProvider(provider)
            user.auth.provider_id = oauth_user.id
            user.auth.provider_data = oauth_user.raw_data

            # Set profile from OAuth data
            user.profile.first_name = oauth_user.first_name
            user.profile.last_name = oauth_user.last_name
            user.profile.avatar_url = oauth_user.avatar_url

            # Assign default role
            default_role = await Role.find_one(Role.is_default == True)
            if default_role:
                user.roles.append(default_role.name)

            await user.save()

        # Update login info
        await user.update_login_info()

        # Generate tokens
        access_token = self.create_access_token(user)
        refresh_token = self.create_refresh_token(user)

        user_data = {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "profile": user.profile.dict(),
            "roles": user.roles,
            "permissions": await self.get_user_permissions(user),
            "ai_access_level": await self.get_user_ai_access_level(user)
        }

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self.access_token_expire * 60,
            user=user_data
        )

    def create_access_token(self, user: User, extended: bool = False) -> str:
        """Create JWT access token"""
        expire_minutes = self.access_token_expire
        if extended:
            expire_minutes = 24 * 60  # 24 hours for "remember me"

        expire = datetime.utcnow() + timedelta(minutes=expire_minutes)

        payload = {
            "sub": str(user.id),
            "email": user.email,
            "roles": user.roles,
            "permissions": user.permissions,
            "ai_access_level": user.get_ai_access_level(),
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        }

        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

    def create_refresh_token(self, user: User) -> str:
        """Create JWT refresh token"""
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire)

        payload = {
            "sub": str(user.id),
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        }

        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

    async def verify_token(self, token: str) -> Optional[User]:
        """Verify JWT token and return user"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            user_id = payload.get("sub")
            token_type = payload.get("type", "access")

            if not user_id or token_type != "access":
                return None

            user = await User.get(user_id)
            if not user or not user.can_login():
                return None

            return user

        except JWTError:
            return None

    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        """Refresh access token using refresh token"""
        try:
            payload = jwt.decode(refresh_token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            user_id = payload.get("sub")
            token_type = payload.get("type")

            if not user_id or token_type != "refresh":
                raise AuthenticationError("Invalid refresh token")

            user = await User.get(user_id)
            if not user or not user.can_login():
                raise AuthenticationError("User not found or inactive")

            # Generate new tokens
            access_token = self.create_access_token(user)
            new_refresh_token = self.create_refresh_token(user)

            user_data = {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "profile": user.profile.dict(),
                "roles": user.roles,
                "permissions": await self.get_user_permissions(user),
                "ai_access_level": await self.get_user_ai_access_level(user)
            }

            return TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token,
                expires_in=self.access_token_expire * 60,
                user=user_data
            )

        except JWTError:
            raise AuthenticationError("Invalid refresh token")

    async def get_user_permissions(self, user: User) -> List[str]:
        """Get all user permissions including role-based permissions"""
        all_permissions = set(user.permissions)

        # Add role-based permissions
        for role_name in user.roles:
            role = await Role.find_one(Role.name == role_name)
            if role:
                role_permissions = await role.get_all_permissions()
                all_permissions.update(role_permissions)

        return list(all_permissions)

    async def get_user_ai_access_level(self, user: User) -> str:
        """Get user's AI access level based on roles"""
        access_levels = ["basic", "advanced", "admin"]
        highest_level = "basic"

        for role_name in user.roles:
            role = await Role.find_one(Role.name == role_name)
            if role and role.ai_access_level in access_levels:
                if access_levels.index(role.ai_access_level) > access_levels.index(highest_level):
                    highest_level = role.ai_access_level

        return highest_level

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return self.pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return self.pwd_context.verify(plain_password, hashed_password)

    def generate_verification_token(self) -> str:
        """Generate secure verification token"""
        return secrets.token_urlsafe(32)
```

---

## FastAPI Integration & Middleware

### 1. Authentication Middleware

**JWT Token Validation Middleware:**

```python
# apps/api/src/auth/middleware.py
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional, List
import re

from .services.auth_service import AuthService
from .models.user import User

class AuthenticationMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, auth_service: AuthService):
        super().__init__(app)
        self.auth_service = auth_service

        # Routes that don't require authentication
        self.public_routes = [
            r"^/docs.*",
            r"^/redoc.*",
            r"^/openapi\.json$",
            r"^/health$",
            r"^/api/auth/login$",
            r"^/api/auth/register$",
            r"^/api/auth/oauth/.*",
            r"^/api/auth/verify-email.*",
            r"^/api/auth/reset-password.*",
            r"^/static/.*"
        ]

    async def dispatch(self, request: Request, call_next):
        # Check if route is public
        if self.is_public_route(request.url.path):
            return await call_next(request)

        # Extract token from Authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Authentication required"}
            )

        token = authorization.split(" ")[1]

        # Verify token and get user
        user = await self.auth_service.verify_token(token)
        if not user:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid or expired token"}
            )

        # Add user to request state
        request.state.user = user
        request.state.permissions = await self.auth_service.get_user_permissions(user)

        return await call_next(request)

    def is_public_route(self, path: str) -> bool:
        """Check if route is public (doesn't require auth)"""
        for pattern in self.public_routes:
            if re.match(pattern, path):
                return True
        return False

class AuthorizationMiddleware(BaseHTTPMiddleware):
    """Role and permission-based authorization"""

    def __init__(self, app, auth_service: AuthService):
        super().__init__(app)
        self.auth_service = auth_service

        # Route permission requirements
        self.route_permissions = {
            r"^/api/admin/.*": ["admin.full"],
            r"^/api/users/.*/delete$": ["user.delete"],
            r"^/api/ai/models/.*": ["ai.basic"],
            r"^/api/ai/chat.*": ["ai.basic"],
        }

    async def dispatch(self, request: Request, call_next):
        # Skip if no user (handled by AuthenticationMiddleware)
        if not hasattr(request.state, "user"):
            return await call_next(request)

        # Check route permissions
        required_permissions = self.get_required_permissions(request.url.path)
        if required_permissions:
            user_permissions = getattr(request.state, "permissions", [])

            if not any(perm in user_permissions for perm in required_permissions):
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "Insufficient permissions"}
                )

        return await call_next(request)

    def get_required_permissions(self, path: str) -> List[str]:
        """Get required permissions for a route"""
        for pattern, permissions in self.route_permissions.items():
            if re.match(pattern, path):
                return permissions
        return []
```

### 2. Authentication Dependencies

**FastAPI Dependency Injection for Auth:**

```python
# apps/api/src/auth/dependencies.py
from fastapi import Depends, HTTPException, status, Request
from typing import List, Optional
from functools import wraps

from .models.user import User
from .services.auth_service import AuthService

async def get_current_user(request: Request) -> User:
    """Get current authenticated user"""
    if not hasattr(request.state, "user"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return request.state.user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    if not current_user.can_login():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

def require_permissions(permissions: List[str]):
    """Decorator to require specific permissions"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request") or args[0]

            if not hasattr(request.state, "permissions"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )

            user_permissions = request.state.permissions
            if not any(perm in user_permissions for perm in permissions):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Required permissions: {', '.join(permissions)}"
                )

            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_roles(roles: List[str]):
    """Decorator to require specific roles"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request") or args[0]

            if not hasattr(request.state, "user"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )

            user = request.state.user
            if not any(role in user.roles for role in roles):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Required roles: {', '.join(roles)}"
                )

            return await func(*args, **kwargs)
        return wrapper
    return decorator

async def get_optional_user(request: Request) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    return getattr(request.state, "user", None)

class AIAccessLevel:
    """AI access level dependency"""

    def __init__(self, min_level: str = "basic"):
        self.min_level = min_level
        self.levels = {"basic": 1, "advanced": 2, "admin": 3}

    async def __call__(self, request: Request) -> User:
        if not hasattr(request.state, "user"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )

        user = request.state.user
        user_level = user.get_ai_access_level()

        if self.levels.get(user_level, 0) < self.levels.get(self.min_level, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {self.min_level} AI access level"
            )

        return user

# Pre-configured dependency instances
require_basic_ai = AIAccessLevel("basic")
require_advanced_ai = AIAccessLevel("advanced")
require_admin_ai = AIAccessLevel("admin")
```

---

## Frontend Authentication Integration

### 1. Authentication Context & Hooks

**React Authentication Management:**

```typescript
// apps/web/src/auth/context.tsx
import React, { createContext, useContext, useReducer, useEffect } from "react";
import { authApi } from "../services/api";
import type {
  User,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
} from "../types/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: User }
  | { type: "AUTH_FAILURE"; payload: string }
  | { type: "AUTH_LOGOUT" }
  | { type: "AUTH_CLEAR_ERROR" };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_START":
      return { ...state, isLoading: true, error: null };
    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case "AUTH_FAILURE":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case "AUTH_LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case "AUTH_CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAIAccess: (level: "basic" | "advanced" | "admin") => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      refreshAuth();
    }
  }, []);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (state.isAuthenticated) {
      const token = localStorage.getItem("access_token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const exp = payload.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = exp - now;

        // Refresh 5 minutes before expiration
        const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0);

        const timeout = setTimeout(() => {
          refreshAuth();
        }, refreshTime);

        return () => clearTimeout(timeout);
      }
    }
  }, [state.isAuthenticated]);

  const login = async (credentials: LoginRequest) => {
    dispatch({ type: "AUTH_START" });

    try {
      const response = await authApi.login(credentials);

      // Store tokens
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);

      dispatch({ type: "AUTH_SUCCESS", payload: response.user });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      dispatch({ type: "AUTH_FAILURE", payload: message });
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    dispatch({ type: "AUTH_START" });

    try {
      await authApi.register(data);
      // Registration successful, but user needs to verify email
      dispatch({ type: "AUTH_CLEAR_ERROR" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registration failed";
      dispatch({ type: "AUTH_FAILURE", payload: message });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    dispatch({ type: "AUTH_LOGOUT" });
  };

  const refreshAuth = async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      logout();
      return;
    }

    try {
      const response = await authApi.refresh(refreshToken);

      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);

      dispatch({ type: "AUTH_SUCCESS", payload: response.user });
    } catch (error) {
      logout();
    }
  };

  const clearError = () => {
    dispatch({ type: "AUTH_CLEAR_ERROR" });
  };

  const hasPermission = (permission: string): boolean => {
    return state.user?.permissions.includes(permission) ?? false;
  };

  const hasRole = (role: string): boolean => {
    return state.user?.roles.includes(role) ?? false;
  };

  const hasAIAccess = (level: "basic" | "advanced" | "admin"): boolean => {
    if (!state.user?.ai_access_level) return false;

    const levels = { basic: 1, advanced: 2, admin: 3 };
    const userLevel =
      levels[state.user.ai_access_level as keyof typeof levels] ?? 0;
    const requiredLevel = levels[level];

    return userLevel >= requiredLevel;
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshAuth,
    clearError,
    hasPermission,
    hasRole,
    hasAIAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

### 2. Route Protection Components

**Protected Route and Permission Guards:**

```typescript
// apps/web/src/auth/components/ProtectedRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
  permissions?: string[];
  aiAccessLevel?: "basic" | "advanced" | "admin";
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  roles = [],
  permissions = [],
  aiAccessLevel,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, user, hasRole, hasPermission, hasAIAccess } =
    useAuth();
  const location = useLocation();

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements
  if (roles.length > 0) {
    const hasRequiredRole = roles.some((role) => hasRole(role));
    if (!hasRequiredRole) {
      return fallback || <Navigate to="/unauthorized" replace />;
    }
  }

  // Check permission requirements
  if (permissions.length > 0) {
    const hasRequiredPermission = permissions.some((permission) =>
      hasPermission(permission)
    );
    if (!hasRequiredPermission) {
      return fallback || <Navigate to="/unauthorized" replace />;
    }
  }

  // Check AI access level
  if (aiAccessLevel && !hasAIAccess(aiAccessLevel)) {
    return fallback || <Navigate to="/upgrade-ai-access" replace />;
  }

  return <>{children}</>;
}

// Permission-based component rendering
interface PermissionGuardProps {
  children: React.ReactNode;
  permissions?: string[];
  roles?: string[];
  aiAccessLevel?: "basic" | "advanced" | "admin";
  fallback?: React.ReactNode;
  any?: boolean; // If true, user needs ANY of the permissions/roles (OR logic)
}

export function PermissionGuard({
  children,
  permissions = [],
  roles = [],
  aiAccessLevel,
  fallback = null,
  any = false,
}: PermissionGuardProps) {
  const { hasRole, hasPermission, hasAIAccess } = useAuth();

  const checkPermissions = () => {
    const permissionChecks = permissions.map((permission) =>
      hasPermission(permission)
    );
    const roleChecks = roles.map((role) => hasRole(role));
    const aiCheck = aiAccessLevel ? hasAIAccess(aiAccessLevel) : true;

    const allChecks = [...permissionChecks, ...roleChecks];

    if (!aiCheck) return false;
    if (allChecks.length === 0) return true;

    return any ? allChecks.some(Boolean) : allChecks.every(Boolean);
  };

  return checkPermissions() ? <>{children}</> : <>{fallback}</>;
}

// AI access level hook
export function useAIAccess(
  requiredLevel: "basic" | "advanced" | "admin" = "basic"
) {
  const { hasAIAccess, user } = useAuth();

  return {
    hasAccess: hasAIAccess(requiredLevel),
    currentLevel: user?.ai_access_level,
    canUpgrade: user?.ai_access_level !== "admin",
  };
}
```

---

## OAuth Integration

### 1. OAuth Service Implementation

**Multi-Provider OAuth Support:**

```python
# apps/api/src/auth/services/oauth_service.py
from typing import Dict, Any, Optional
import httpx
from pydantic import BaseModel
from ..exceptions import AuthenticationError

class OAuthUser(BaseModel):
    id: str
    email: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    raw_data: Dict[str, Any]

class OAuthProvider:
    def __init__(self, config: Dict[str, Any]):
        self.config = config

    async def get_access_token(self, code: str, redirect_uri: str) -> str:
        raise NotImplementedError

    async def get_user_info(self, access_token: str) -> OAuthUser:
        raise NotImplementedError

class GoogleOAuthProvider(OAuthProvider):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client_id = config["client_id"]
        self.client_secret = config["client_secret"]

    async def get_access_token(self, code: str, redirect_uri: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                }
            )

            if response.status_code != 200:
                raise AuthenticationError("Failed to exchange code for token")

            return response.json()["access_token"]

    async def get_user_info(self, access_token: str) -> OAuthUser:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )

            if response.status_code != 200:
                raise AuthenticationError("Failed to get user info")

            data = response.json()

            return OAuthUser(
                id=data["id"],
                email=data["email"],
                username=data.get("email"),  # Google doesn't provide username
                first_name=data.get("given_name"),
                last_name=data.get("family_name"),
                avatar_url=data.get("picture"),
                raw_data=data
            )

class GitHubOAuthProvider(OAuthProvider):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client_id = config["client_id"]
        self.client_secret = config["client_secret"]

    async def get_access_token(self, code: str, redirect_uri: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": redirect_uri
                },
                headers={"Accept": "application/json"}
            )

            if response.status_code != 200:
                raise AuthenticationError("Failed to exchange code for token")

            return response.json()["access_token"]

    async def get_user_info(self, access_token: str) -> OAuthUser:
        async with httpx.AsyncClient() as client:
            # Get user info
            user_response = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"}
            )

            if user_response.status_code != 200:
                raise AuthenticationError("Failed to get user info")

            user_data = user_response.json()

            # Get primary email
            email_response = await client.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {access_token}"}
            )

            email = user_data.get("email")
            if not email and email_response.status_code == 200:
                emails = email_response.json()
                primary_email = next((e for e in emails if e["primary"]), None)
                if primary_email:
                    email = primary_email["email"]

            return OAuthUser(
                id=str(user_data["id"]),
                email=email,
                username=user_data.get("login"),
                first_name=user_data.get("name", "").split(" ")[0] if user_data.get("name") else None,
                last_name=" ".join(user_data.get("name", "").split(" ")[1:]) if user_data.get("name") and len(user_data["name"].split(" ")) > 1 else None,
                avatar_url=user_data.get("avatar_url"),
                raw_data=user_data
            )

class OAuthService:
    def __init__(self, config: Dict[str, Any]):
        self.providers = {}

        if "google" in config:
            self.providers["google"] = GoogleOAuthProvider(config["google"])

        if "github" in config:
            self.providers["github"] = GitHubOAuthProvider(config["github"])

    async def get_user_info(self, provider: str, code: str, redirect_uri: str) -> OAuthUser:
        if provider not in self.providers:
            raise AuthenticationError(f"OAuth provider {provider} not configured")

        oauth_provider = self.providers[provider]
        access_token = await oauth_provider.get_access_token(code, redirect_uri)
        return await oauth_provider.get_user_info(access_token)
```

### 2. OAuth Routes

**FastAPI OAuth Endpoints:**

```python
# apps/api/src/auth/routes/oauth.py
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional

from ..services.auth_service import AuthService, TokenResponse
from ..services.oauth_service import OAuthService
from ..exceptions import AuthenticationError

router = APIRouter(prefix="/oauth", tags=["oauth"])

class OAuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: str
    state: Optional[str] = None

@router.get("/{provider}/authorize")
async def oauth_authorize(
    provider: str,
    redirect_uri: str = Query(...),
    state: Optional[str] = Query(None)
):
    """Get OAuth authorization URL"""

    authorization_urls = {
        "google": "https://accounts.google.com/oauth2/v2/auth",
        "github": "https://github.com/login/oauth/authorize",
    }

    if provider not in authorization_urls:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )

    # Get client ID from config
    oauth_config = app.state.config.get("oauth", {}).get(provider, {})
    client_id = oauth_config.get("client_id")

    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth provider {provider} not properly configured"
        )

    # Build authorization URL
    base_url = authorization_urls[provider]
    scopes = {
        "google": "openid email profile",
        "github": "user:email"
    }

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": scopes.get(provider, ""),
        "response_type": "code"
    }

    if state:
        params["state"] = state

    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    authorization_url = f"{base_url}?{query_string}"

    return {"authorization_url": authorization_url}

@router.post("/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: OAuthCallbackRequest,
    auth_service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """Handle OAuth callback and authenticate user"""

    try:
        return await auth_service.oauth_login(
            provider=provider,
            code=request.code,
            redirect_uri=request.redirect_uri
        )
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{provider}/link")
async def link_oauth_account(
    provider: str,
    request: OAuthCallbackRequest,
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Link OAuth account to existing user"""

    try:
        oauth_service = OAuthService(app.state.config.get("oauth", {}))
        oauth_user = await oauth_service.get_user_info(
            provider, request.code, request.redirect_uri
        )

        # Check if OAuth account is already linked to another user
        existing_user = await User.find_one(
            User.auth.provider == provider,
            User.auth.provider_id == oauth_user.id
        )

        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account is already linked to another user"
            )

        # Link account
        current_user.auth.provider_data[provider] = {
            "provider_id": oauth_user.id,
            "email": oauth_user.email,
            "username": oauth_user.username,
            "linked_at": datetime.now(timezone.utc).isoformat()
        }

        await current_user.save()

        return {"message": f"{provider.title()} account linked successfully"}

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{provider}/unlink")
async def unlink_oauth_account(
    provider: str,
    current_user: User = Depends(get_current_active_user)
):
    """Unlink OAuth account from user"""

    if provider in current_user.auth.provider_data:
        del current_user.auth.provider_data[provider]
        await current_user.save()

        return {"message": f"{provider.title()} account unlinked successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No {provider} account linked"
        )
```

---

## AI-Aware Authentication

### 1. AI Context Integration

**User AI Context and Personalization:**

```python
# apps/api/src/auth/ai_integration.py
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

class AIUserContext:
    """Manage user-specific AI context and preferences"""

    def __init__(self, user: User):
        self.user = user

    def get_ai_context(self) -> Dict[str, Any]:
        """Get user's AI interaction context"""
        return {
            "user_id": str(self.user.id),
            "preferences": self.user.ai_preferences,
            "access_level": self.get_access_level(),
            "usage_stats": self.get_usage_stats(),
            "personalization": self.get_personalization_data()
        }

    def get_access_level(self) -> str:
        """Get user's AI access level based on roles"""
        access_levels = ["basic", "advanced", "admin"]
        highest_level = "basic"

        for role_name in self.user.roles:
            # This would be implemented with role lookup
            # For now, simplified logic
            if "admin" in role_name:
                highest_level = "admin"
            elif "premium" in role_name and highest_level != "admin":
                highest_level = "advanced"

        return highest_level

    def get_usage_stats(self) -> Dict[str, Any]:
        """Get user's AI usage statistics"""
        # This would integrate with usage tracking system
        return self.user.ai_context.get("usage_stats", {
            "daily_requests": 0,
            "monthly_requests": 0,
            "total_requests": 0,
            "last_request_at": None
        })

    def get_personalization_data(self) -> Dict[str, Any]:
        """Get user's AI personalization preferences"""
        return self.user.ai_preferences.get("personalization", {
            "preferred_model": "llama3.1",
            "preferred_provider": "ollama",
            "temperature": 0.7,
            "max_tokens": 1000,
            "system_prompt_additions": [],
            "conversation_style": "helpful",
            "language": "en"
        })

    async def update_ai_preferences(self, preferences: Dict[str, Any]) -> None:
        """Update user's AI preferences"""
        self.user.ai_preferences.update(preferences)
        self.user.updated_at = datetime.now(timezone.utc)
        await self.user.save()

    async def record_ai_usage(self, provider: str, model: str, tokens_used: int) -> None:
        """Record AI usage for quota tracking"""
        usage_stats = self.user.ai_context.get("usage_stats", {})

        # Update usage statistics
        usage_stats["total_requests"] = usage_stats.get("total_requests", 0) + 1
        usage_stats["daily_requests"] = usage_stats.get("daily_requests", 0) + 1
        usage_stats["monthly_requests"] = usage_stats.get("monthly_requests", 0) + 1
        usage_stats["last_request_at"] = datetime.now(timezone.utc).isoformat()
        usage_stats["tokens_used"] = usage_stats.get("tokens_used", 0) + tokens_used

        # Track per-provider usage
        provider_stats = usage_stats.get("by_provider", {})
        provider_stats[provider] = provider_stats.get(provider, 0) + 1
        usage_stats["by_provider"] = provider_stats

        self.user.ai_context["usage_stats"] = usage_stats
        await self.user.save()

    def check_ai_quota(self) -> Dict[str, Any]:
        """Check if user has exceeded AI usage quotas"""
        usage_stats = self.get_usage_stats()
        access_level = self.get_access_level()

        # Get quota limits based on access level
        quotas = {
            "basic": {"daily": 100, "monthly": 1000},
            "advanced": {"daily": 1000, "monthly": 10000},
            "admin": {"daily": None, "monthly": None}  # Unlimited
        }

        level_quotas = quotas.get(access_level, quotas["basic"])

        return {
            "access_level": access_level,
            "daily_used": usage_stats.get("daily_requests", 0),
            "daily_limit": level_quotas["daily"],
            "daily_remaining": (
                level_quotas["daily"] - usage_stats.get("daily_requests", 0)
                if level_quotas["daily"] else None
            ),
            "monthly_used": usage_stats.get("monthly_requests", 0),
            "monthly_limit": level_quotas["monthly"],
            "monthly_remaining": (
                level_quotas["monthly"] - usage_stats.get("monthly_requests", 0)
                if level_quotas["monthly"] else None
            ),
            "can_make_request": (
                (level_quotas["daily"] is None or usage_stats.get("daily_requests", 0) < level_quotas["daily"]) and
                (level_quotas["monthly"] is None or usage_stats.get("monthly_requests", 0) < level_quotas["monthly"])
            )
        }
```

---

## Configuration Integration

### 1. Farm Config Auth Settings

**TypeScript Configuration for Authentication:**

```typescript
// farm.config.ts - Authentication configuration
import { defineConfig } from "@farm/core";

export default defineConfig({
  auth: {
    // JWT configuration
    jwt: {
      secret: process.env.JWT_SECRET || "your-super-secret-jwt-key",
      algorithm: "HS256",
      accessTokenExpire: 15, // minutes
      refreshTokenExpire: 7, // days
    },

    // OAuth providers
    oauth: {
      google: {
        enabled: true,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        scope: "openid email profile",
      },
      github: {
        enabled: true,
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        scope: "user:email",
      },
    },

    // Authentication options
    features: {
      emailVerification: true,
      twoFactorAuth: false,
      passwordReset: true,
      accountLocking: true,
      sessionManagement: true,
    },

    // Password policy
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      maxAge: 90, // days
    },

    // Account security
    security: {
      maxFailedLogins: 5,
      lockoutDuration: 30, // minutes
      sessionTimeout: 24, // hours
      enforceUniquePasswords: 5, // last N passwords
    },

    // AI integration
    ai: {
      quotas: {
        basic: {
          daily: 100,
          monthly: 1000,
        },
        advanced: {
          daily: 1000,
          monthly: 10000,
        },
        admin: {
          daily: null, // unlimited
          monthly: null,
        },
      },
      defaultModel: "llama3.1",
      defaultProvider: "ollama",
    },
  },
});
```

---

_Status: ✅ Completed - Ready for implementation_

This authentication system provides:

- **Comprehensive user management** with roles, permissions, and AI context
- **Multiple authentication methods** (JWT, OAuth, SAML-ready)
- **Type-safe full-stack integration** with React context and hooks
- **AI-aware authentication** with usage quotas and personalization
- **Flexible RBAC system** with hierarchical roles and permissions
- **Production-ready security** with proper token handling and middleware
- **OAuth integration** with major providers (Google, GitHub, extensible)
- **Route protection** with granular permission controls
