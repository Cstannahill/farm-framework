// tools/codegen/src/__tests__/schema.test.ts
import { OpenAPISchemaExtractor } from "../schema/extractor";
import { SchemaWatcher } from "../schema/watcher";
import { promises as fs } from "fs";
import { join } from "path";
import { spawn } from "child_process";

describe("FARM Schema Extraction System", () => {
  const testProjectRoot = join(__dirname, "../../../__test-fixtures__");
  const testApiPath = join(testProjectRoot, "apps/api/src/main.py");
  const testCacheDir = join(testProjectRoot, ".farm/cache/schemas");

  beforeAll(async () => {
    // Create test project structure
    await createTestProject();
  });

  afterAll(async () => {
    // Cleanup test files
    await cleanupTestProject();
  });

  describe("OpenAPISchemaExtractor", () => {
    let extractor: OpenAPISchemaExtractor;

    beforeEach(() => {
      extractor = new OpenAPISchemaExtractor({
        apiPath: testApiPath,
        port: 8005, // Use unique port for tests
        timeout: 15000,
        cacheDir: testCacheDir,
        forceRefresh: false,
      });
    });

    afterEach(async () => {
      // Clear cache between tests
      await extractor.clearCache();
    });

    test("should extract valid OpenAPI schema from FastAPI app", async () => {
      const schema = await extractor.extractSchema();

      expect(schema).toBeDefined();
      expect(schema.openapi).toMatch(/^3\./);
      expect(schema.info).toBeDefined();
      expect(schema.info.title).toBe("Test FARM API");
      expect(schema.paths).toBeDefined();
      expect(Object.keys(schema.paths)).toContain("/health");
      expect(Object.keys(schema.paths)).toContain("/api/users");
    }, 30000);

    test("should cache schemas correctly", async () => {
      // First extraction
      const start1 = Date.now();
      const schema1 = await extractor.extractSchema();
      const time1 = Date.now() - start1;

      // Second extraction (should use cache)
      const start2 = Date.now();
      const schema2 = await extractor.extractSchema();
      const time2 = Date.now() - start2;

      expect(schema1).toEqual(schema2);
      expect(time2).toBeLessThan(time1); // Cache should be faster
    }, 30000);

    test("should force refresh when requested", async () => {
      const forcedExtractor = new OpenAPISchemaExtractor({
        apiPath: testApiPath,
        port: 8006,
        forceRefresh: true,
        cacheDir: testCacheDir,
      });

      const schema = await forcedExtractor.extractSchema();
      expect(schema).toBeDefined();
    }, 30000);

    test("should validate schema structure", async () => {
      const schema = await extractor.extractSchema();

      // Test required OpenAPI fields
      expect(schema.openapi).toBeDefined();
      expect(schema.info).toBeDefined();
      expect(schema.info.title).toBeDefined();
      expect(schema.paths).toBeDefined();

      // Test paths structure
      for (const [path, methods] of Object.entries(schema.paths)) {
        expect(path).toMatch(/^\//);
        expect(typeof methods).toBe("object");
      }
    }, 30000);

    test("should handle extraction errors gracefully", async () => {
      const badExtractor = new OpenAPISchemaExtractor({
        apiPath: "nonexistent/path/main.py",
        port: 8007,
        timeout: 5000,
      });

      await expect(badExtractor.extractSchema()).rejects.toThrow();
    });

    test("should provide cache statistics", async () => {
      // Create a cached schema first
      await extractor.extractSchema();

      const stats = await extractor.getCacheStats();
      expect(stats.files).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.lastModified).toBeInstanceOf(Date);
    }, 30000);

    test("should clear cache successfully", async () => {
      // Create a cached schema first
      await extractor.extractSchema();

      let stats = await extractor.getCacheStats();
      expect(stats.files).toBeGreaterThan(0);

      // Clear cache
      await extractor.clearCache();

      stats = await extractor.getCacheStats();
      expect(stats.files).toBe(0);
    }, 30000);
  });

  describe("SchemaWatcher", () => {
    let watcher: SchemaWatcher;

    beforeEach(() => {
      watcher = new SchemaWatcher({
        projectRoot: testProjectRoot,
        extractorOptions: {
          apiPath: testApiPath,
          port: 8008,
          forceRefresh: true,
        },
        debounceMs: 500,
        verbose: false,
      });
    });

    afterEach(async () => {
      if (watcher) {
        await watcher.stop();
      }
    });

    test("should start and stop watcher successfully", async () => {
      await watcher.start();

      const stats = watcher.getStats();
      expect(stats.isWatching).toBe(true);
      expect(stats.filesWatched).toBeGreaterThan(0);

      await watcher.stop();

      const finalStats = watcher.getStats();
      expect(finalStats.isWatching).toBe(false);
    });

    test("should extract initial schema on start", async () => {
      let schemaExtracted = false;

      watcher.on("schema-extracted", (event) => {
        schemaExtracted = true;
        expect(event.schema).toBeDefined();
        expect(event.type).toBe("changed");
      });

      await watcher.start();

      // Wait a bit for initial extraction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(schemaExtracted).toBe(true);
    }, 30000);

    test("should detect file changes and trigger extraction", async () => {
      const changeEvents: any[] = [];

      watcher.on("schema-extracted", (event) => {
        changeEvents.push(event);
      });

      await watcher.start();

      // Wait for initial extraction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Modify a file to trigger change detection
      const routeFile = join(testProjectRoot, "apps/api/src/routes/users.py");
      await fs.appendFile(routeFile, "\n# Test comment");

      // Wait for debounce and extraction
      await new Promise((resolve) => setTimeout(resolve, 3000));

      expect(changeEvents.length).toBeGreaterThan(0);
    }, 35000);

    test("should handle extraction errors gracefully", async () => {
      const errorWatcher = new SchemaWatcher({
        projectRoot: testProjectRoot,
        extractorOptions: {
          apiPath: "nonexistent/main.py",
          port: 8009,
        },
        verbose: false,
      });

      let errorCaught = false;

      errorWatcher.on("extraction-error", (event) => {
        errorCaught = true;
        expect(event.error).toBeDefined();
      });

      try {
        await errorWatcher.start();
        await new Promise((resolve) => setTimeout(resolve, 2000));
        expect(errorCaught).toBe(true);
      } finally {
        await errorWatcher.stop();
      }
    });

    test("should force extraction on demand", async () => {
      await watcher.start();

      const schema = await watcher.forceExtraction();
      expect(schema).toBeDefined();
      expect(schema.info.title).toBe("Test FARM API");
    }, 30000);
  });

  describe("Integration Tests", () => {
    test("should work end-to-end with real FastAPI app", async () => {
      // Start a real FastAPI server
      const serverProcess = spawn(
        "uvicorn",
        ["src.main:app", "--host", "0.0.0.0", "--port", "8010"],
        {
          cwd: join(testProjectRoot, "apps/api"),
          stdio: "pipe",
        }
      );

      try {
        // Wait for server to start
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Extract schema
        const extractor = new OpenAPISchemaExtractor({
          apiPath: testApiPath,
          port: 8010,
        });

        const schema = await extractor.extractSchema();

        expect(schema).toBeDefined();
        expect(schema.paths).toBeDefined();
        expect(Object.keys(schema.paths).length).toBeGreaterThan(0);
      } finally {
        // Cleanup server
        serverProcess.kill("SIGTERM");
        await new Promise((resolve) => {
          serverProcess.on("exit", resolve);
          setTimeout(() => {
            serverProcess.kill("SIGKILL");
            resolve(undefined);
          }, 5000);
        });
      }
    }, 45000);
  });
});

// Test utilities
async function createTestProject(): Promise<void> {
  const projectRoot = join(__dirname, "../../../__test-fixtures__");

  // Create directory structure
  await fs.mkdir(join(projectRoot, "apps/api/src/routes"), { recursive: true });
  await fs.mkdir(join(projectRoot, "apps/api/src/models"), { recursive: true });

  // Create main.py
  const mainPy = `
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import users, health

app = FastAPI(
    title="Test FARM API",
    version="0.1.0",
    description="Test API for FARM framework schema extraction"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(users.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
`;

  await fs.writeFile(join(projectRoot, "apps/api/src/main.py"), mainPy);

  // Create __init__.py files
  await fs.writeFile(join(projectRoot, "apps/api/src/__init__.py"), "");
  await fs.writeFile(join(projectRoot, "apps/api/src/routes/__init__.py"), "");
  await fs.writeFile(join(projectRoot, "apps/api/src/models/__init__.py"), "");

  // Create health router
  const healthPy = `
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "test-api"}
`;

  await fs.writeFile(
    join(projectRoot, "apps/api/src/routes/health.py"),
    healthPy
  );

  // Create users router
  const usersPy = `
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class User(BaseModel):
    id: Optional[int] = None
    name: str
    email: str
    active: bool = True

class CreateUserRequest(BaseModel):
    name: str
    email: str

@router.get("/users", response_model=List[User])
async def list_users():
    return [
        User(id=1, name="John Doe", email="john@example.com"),
        User(id=2, name="Jane Smith", email="jane@example.com")
    ]

@router.post("/users", response_model=User)
async def create_user(user_data: CreateUserRequest):
    return User(id=3, **user_data.dict())

@router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    return User(id=user_id, name="Test User", email="test@example.com")
`;

  await fs.writeFile(
    join(projectRoot, "apps/api/src/routes/users.py"),
    usersPy
  );

  // Create requirements.txt
  const requirements = `
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
`;

  await fs.writeFile(
    join(projectRoot, "apps/api/requirements.txt"),
    requirements
  );
}

async function cleanupTestProject(): Promise<void> {
  const projectRoot = join(__dirname, "../../../__test-fixtures__");

  try {
    await fs.rmdir(projectRoot, { recursive: true });
  } catch (error) {
    // Ignore cleanup errors
    console.warn(
      "Failed to cleanup test project:",
      error instanceof Error ? error.message : String(error)
    );
  }
}
