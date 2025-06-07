// tools/codegen/src/__tests__/test-utils.ts
import { join, dirname } from "path";
import { ensureDir, writeFile, pathExists } from "fs-extra";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function ensureTestFixturesDir(): Promise<string> {
  const fixturesDir = join(__dirname, "../../../__test-fixtures__");
  await ensureDir(fixturesDir);
  return fixturesDir;
}

export async function createTestFastAPIApp(): Promise<string> {
  const fixturesDir = await ensureTestFixturesDir();
  const testAppContent = `#!/usr/bin/env python3
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
    id: int = Field(..., description="User ID")
    name: str = Field(..., description="User full name")
    email: str = Field(..., description="User email address")
    age: Optional[int] = Field(None, ge=0, description="User age")
    preferences: Optional[dict] = Field(default_factory=dict, description="User preferences")
    tags: Optional[List[str]] = Field(default_factory=list, description="User tags")
    status: UserStatus = Field(UserStatus.active, description="User status")
    createdAt: Optional[str] = Field(None, description="Creation timestamp")

class CreateUserRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., regex=r'^[^@]+@[^@]+\\.[^@]+$')
    age: Optional[int] = Field(None, ge=0, le=150)

# Mock data
users_db = [
    User(
        id=1,
        name="John Doe",
        email="john@example.com",
        age=30,
        preferences={"theme": "dark"},
        tags=["developer", "python"],
        status=UserStatus.active
    ),
]

# Routes
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "API is running"}

@app.get("/api/users", response_model=List[User])
async def list_users():
    """List users"""
    return users_db

@app.post("/api/users", response_model=User, status_code=201)
async def create_user(user_data: CreateUserRequest):
    """Create a new user"""
    new_user = User(
        id=len(users_db) + 1,
        name=user_data.name,
        email=user_data.email,
        age=user_data.age,
        preferences={},
        tags=[],
        status=UserStatus.pending
    )
    users_db.append(new_user)
    return new_user

@app.get("/api/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    """Get user by ID"""
    for user in users_db:
        if user.id == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8899))
    uvicorn.run(app, host="0.0.0.0", port=port)
`;

  const tempPath = join(fixturesDir, "temp_app.py");
  await writeFile(tempPath, testAppContent);
  return tempPath;
}

export const sampleOpenAPISchema = {
  openapi: "3.0.0",
  info: {
    title: "Test API",
    version: "1.0.0",
  },
  components: {
    schemas: {
      User: {
        type: "object",
        required: ["id", "name", "email"],
        properties: {
          id: {
            type: "integer",
            description: "User ID",
          },
          name: {
            type: "string",
            description: "User full name",
          },
          email: {
            type: "string",
            format: "email",
            description: "User email address",
          },
          age: {
            type: "integer",
            minimum: 0,
            description: "User age (optional)",
          },
          status: {
            type: "string",
            enum: ["active", "inactive", "pending"],
            description: "User status",
          },
          preferences: {
            type: "object",
            additionalProperties: true,
            description: "User preferences",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Creation timestamp",
          },
        },
      },
      CreateUserRequest: {
        type: "object",
        required: ["name", "email"],
        properties: {
          name: {
            type: "string",
          },
          email: {
            type: "string",
            format: "email",
          },
          age: {
            type: "integer",
            minimum: 0,
          },
        },
      },
      UserStatus: {
        type: "string",
        enum: ["active", "inactive", "pending"],
      },
    },
  },
  paths: {
    "/api/users": {
      get: {
        operationId: "listUsers",
        summary: "List users",
        responses: {
          "200": {
            description: "List of users",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/User",
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: "createUser",
        summary: "Create user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateUserRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created user",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
        },
      },
    },
  },
};
