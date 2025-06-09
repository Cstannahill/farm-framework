# tools/codegen/src/__tests__/test-fixtures/fastapi-app.py
import sys
import os
from pathlib import Path

# Add current directory to Python path so imports work
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

app = FastAPI(
    title="Test FARM API",
    description="Test FastAPI application for schema extraction",
    version="1.0.0",
)


# Models
class UserStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    pending = "pending"


class User(BaseModel):
    id: str = Field(..., description="User ID")
    name: str = Field(..., description="User full name")
    email: str = Field(..., description="User email address")
    age: Optional[int] = Field(None, ge=0, description="User age")
    preferences: Optional[dict] = Field(
        default_factory=dict, description="User preferences"
    )
    tags: Optional[List[str]] = Field(default_factory=list, description="User tags")
    status: UserStatus = Field(UserStatus.active, description="User status")


class CreateUserRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., regex=r"^[^@]+@[^@]+\.[^@]+$")
    age: Optional[int] = Field(None, ge=0, le=150)


class UpdateUserRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = Field(None, regex=r"^[^@]+@[^@]+\.[^@]+$")
    age: Optional[int] = Field(None, ge=0, le=150)
    status: Optional[UserStatus] = None


class PaginatedResponse(BaseModel):
    items: List[User]
    total: int
    page: int
    limit: int


# Mock data
users_db = [
    User(
        id="1",
        name="John Doe",
        email="john@example.com",
        age=30,
        preferences={"theme": "dark"},
        tags=["developer", "python"],
        status=UserStatus.active,
    ),
    User(
        id="2",
        name="Jane Smith",
        email="jane@example.com",
        age=25,
        preferences={"theme": "light"},
        tags=["designer", "frontend"],
        status=UserStatus.active,
    ),
]


# Routes
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "API is running"}


@app.get("/api/users", response_model=PaginatedResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
):
    """List users with pagination"""
    start = (page - 1) * limit
    end = start + limit

    return PaginatedResponse(
        items=users_db[start:end], total=len(users_db), page=page, limit=limit
    )


@app.post("/api/users", response_model=User, status_code=201)
async def create_user(user_data: CreateUserRequest):
    """Create a new user"""
    new_user = User(
        id=str(len(users_db) + 1),
        name=user_data.name,
        email=user_data.email,
        age=user_data.age,
        preferences={},
        tags=[],
        status=UserStatus.pending,
    )
    users_db.append(new_user)
    return new_user


@app.get("/api/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    for user in users_db:
        if user.id == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")


@app.patch("/api/users/{user_id}", response_model=User)
async def update_user(user_id: str, update_data: UpdateUserRequest):
    """Update user by ID"""
    for user in users_db:
        if user.id == user_id:
            if update_data.name is not None:
                user.name = update_data.name
            if update_data.email is not None:
                user.email = update_data.email
            if update_data.age is not None:
                user.age = update_data.age
            if update_data.status is not None:
                user.status = update_data.status
            return user
    raise HTTPException(status_code=404, detail="User not found")


@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str):
    """Delete user by ID"""
    for i, user in enumerate(users_db):
        if user.id == user_id:
            users_db.pop(i)
            return {"message": "User deleted successfully"}
    raise HTTPException(status_code=404, detail="User not found")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8899))
    uvicorn.run(app, host="0.0.0.0", port=port)
