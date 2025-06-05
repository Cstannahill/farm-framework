// tools/codegen/src/__tests__/typescript-generation.test.ts
import {
  TypeScriptGenerator,
  TypeScriptGenerationOptions,
} from "../generators/typescript";
import { TypeGenerationManager } from "../generators/manager";
import { OpenAPISchema } from "../schema/extractor";
import { promises as fs } from "fs";
import { join } from "path";

// Sample OpenAPI schema for testing
const sampleSchema: OpenAPISchema = {
  openapi: "3.0.0",
  info: {
    title: "Test API",
    version: "1.0.0",
    description: "Test API for TypeScript generation",
  },
  paths: {
    "/users": {
      get: {
        operationId: "listUsers",
        responses: {
          "200": {
            description: "List of users",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: "createUser",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUserRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Created user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
      },
    },
    "/users/{userId}": {
      get: {
        operationId: "getUserById",
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "User details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: "object",
        description: "User entity",
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
            description: "User full name",
          },
          email: {
            type: "string",
            format: "email",
            description: "User email address",
          },
          age: {
            type: "integer",
            description: "User age",
          },
        },
      },
      UserStatus: {
        type: "string",
        enum: ["active", "inactive", "pending"],
        description: "User status enumeration",
      },
      PaginatedResponse: {
        type: "object",
        required: ["items", "total", "page", "pageSize"],
        properties: {
          items: {
            type: "array",
            items: {},
            description: "Array of items",
          },
          total: {
            type: "integer",
            description: "Total number of items",
          },
          page: {
            type: "integer",
            description: "Current page number",
          },
          pageSize: {
            type: "integer",
            description: "Number of items per page",
          },
        },
      },
    },
  },
};

describe("FARM TypeScript Generation System", () => {
  const testOutputDir = join(__dirname, "../../../__test-output__/types");

  beforeAll(async () => {
    // Create test output directory
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test output
    try {
      await fs.rmdir(testOutputDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("TypeScriptGenerator", () => {
    let generator: TypeScriptGenerator;

    beforeEach(() => {
      const options: TypeScriptGenerationOptions = {
        outputDir: testOutputDir,
        generateComments: true,
        enumType: "union",
        dateType: "string",
        fileNaming: "camelCase",
      };

      generator = new TypeScriptGenerator(sampleSchema, options);
    });

    test("should generate TypeScript interfaces from OpenAPI schema", async () => {
      const result = await generator.generateTypes();

      expect(result.files.length).toBeGreaterThan(0);
      expect(result.stats.interfaces).toBeGreaterThan(0);
      expect(result.stats.totalFiles).toBe(result.files.length);

      // Check that User interface was generated
      const userFile = result.files.find((f) => f.path.includes("user.ts"));
      expect(userFile).toBeDefined();
      expect(userFile?.content).toContain("export interface User");
      expect(userFile?.content).toContain("id: number;");
      expect(userFile?.content).toContain("name: string;");
      expect(userFile?.content).toContain("email: string;");
      expect(userFile?.content).toContain("age?: number;"); // Optional field
    });

    test("should handle enums correctly", async () => {
      const result = await generator.generateTypes();

      const userFile = result.files.find((f) => f.path.includes("user.ts"));
      expect(userFile?.content).toContain(
        'status?: "active" | "inactive" | "pending"'
      );
    });

    test("should generate enum types with different strategies", async () => {
      // Test union type generation (default)
      let result = await generator.generateTypes();
      let statusFile = result.files.find((f) =>
        f.path.includes("userStatus.ts")
      );
      expect(statusFile?.content).toContain(
        'export type UserStatus = "active" | "inactive" | "pending"'
      );

      // Test enum generation
      const enumGenerator = new TypeScriptGenerator(sampleSchema, {
        outputDir: testOutputDir,
        enumType: "enum",
      });

      result = await enumGenerator.generateTypes();
      statusFile = result.files.find((f) => f.path.includes("userStatus.ts"));
      expect(statusFile?.content).toContain("export enum UserStatus");
      expect(statusFile?.content).toContain('ACTIVE = "active"');
    });

    test("should handle date types correctly", async () => {
      // Test string date type (default)
      let result = await generator.generateTypes();
      let userFile = result.files.find((f) => f.path.includes("user.ts"));
      expect(userFile?.content).toContain("createdAt?: string;");

      // Test Date type
      const dateGenerator = new TypeScriptGenerator(sampleSchema, {
        outputDir: testOutputDir,
        dateType: "Date",
      });

      result = await dateGenerator.generateTypes();
      userFile = result.files.find((f) => f.path.includes("user.ts"));
      expect(userFile?.content).toContain("createdAt?: Date;");
    });

    test("should generate API request/response types", async () => {
      const result = await generator.generateTypes();

      // Check for request types
      const requestFile = result.files.find((f) =>
        f.path.includes("requests.ts")
      );
      expect(requestFile).toBeDefined();
      expect(requestFile?.content).toContain("CreateUserRequest");
      expect(requestFile?.content).toContain("GetUserByIdRequest");

      // Check for response types
      const responseFile = result.files.find((f) =>
        f.path.includes("responses.ts")
      );
      expect(responseFile).toBeDefined();
      expect(responseFile?.content).toContain("ListUsersResponse");
      expect(responseFile?.content).toContain("CreateUserResponse");
    });

    test("should generate proper index file", async () => {
      const result = await generator.generateTypes();

      const indexFile = result.files.find((f) => f.path === "index.ts");
      expect(indexFile).toBeDefined();
      expect(indexFile?.content).toContain("export * from");
      expect(indexFile?.content).toContain("models/user");
    });

    test("should handle complex types and references", async () => {
      const result = await generator.generateTypes();

      // Check generic type handling
      const paginatedFile = result.files.find((f) =>
        f.path.includes("paginatedResponse.ts")
      );
      expect(paginatedFile?.content).toContain("items: Array<any>;");

      // Check object with additionalProperties
      const userFile = result.files.find((f) => f.path.includes("user.ts"));
      expect(userFile?.content).toContain("preferences?: Record<string, any>;");
    });

    test("should include JSDoc comments when enabled", async () => {
      const result = await generator.generateTypes();

      const userFile = result.files.find((f) => f.path.includes("user.ts"));
      expect(userFile?.content).toContain("/** User entity */");
      expect(userFile?.content).toContain("/** User ID */");
      expect(userFile?.content).toContain("/** User full name */");
    });

    test("should skip comments when disabled", async () => {
      const noCommentGenerator = new TypeScriptGenerator(sampleSchema, {
        outputDir: testOutputDir,
        generateComments: false,
      });

      const result = await noCommentGenerator.generateTypes();
      const userFile = result.files.find((f) => f.path.includes("user.ts"));
      expect(userFile?.content).not.toContain("/** User entity */");
    });
  });

  describe("TypeGenerationManager", () => {
    let manager: TypeGenerationManager;

    beforeEach(() => {
      manager = new TypeGenerationManager({
        outputDir: testOutputDir,
        metadataFile: join(
          testOutputDir,
          ".farm/metadata/test-generation.json"
        ),
        cleanOrphans: true,
      });
    });

    afterEach(async () => {
      await manager.stop();
    });

    test("should perform initial generation", async () => {
      const result = await manager.generateFromSchema(sampleSchema);

      expect(result.files.length).toBeGreaterThan(0);
      expect(result.stats.interfaces).toBeGreaterThan(0);

      // Verify files were actually written
      const files = await fs.readdir(testOutputDir);
      expect(files.length).toBeGreaterThan(0);
    });

    test("should skip regeneration when schema unchanged", async () => {
      // First generation
      const result1 = await manager.generateFromSchema(sampleSchema);
      expect(result1.stats.totalFiles).toBeGreaterThan(0);

      // Second generation with same schema
      const result2 = await manager.generateFromSchema(sampleSchema);
      expect(result2.stats.totalFiles).toBe(0); // Should skip
    });

    test("should regenerate when schema changes", async () => {
      // First generation
      await manager.generateFromSchema(sampleSchema);

      // Modify schema
      const modifiedSchema = {
        ...sampleSchema,
        components: {
          ...sampleSchema.components,
          schemas: {
            ...sampleSchema.components!.schemas,
            NewModel: {
              type: "object",
              properties: {
                id: { type: "integer" },
              },
            },
          },
        },
      };

      // Second generation with modified schema
      const result = await manager.generateFromSchema(modifiedSchema);
      expect(result.stats.totalFiles).toBeGreaterThan(0); // Should regenerate
    });

    test("should force regeneration when requested", async () => {
      // First generation
      await manager.generateFromSchema(sampleSchema);

      // Force regeneration
      const result = await manager.forceRegeneration();
      expect(result.stats.totalFiles).toBeGreaterThan(0);
    });

    test("should track generation statistics", async () => {
      await manager.generateFromSchema(sampleSchema);

      const stats = manager.getStats();
      expect(stats.totalGeneration).toBe(1);
      expect(stats.filesCreated).toBeGreaterThan(0);
      expect(stats.lastGeneration).toBeInstanceOf(Date);
      expect(stats.averageGenerationTime).toBeGreaterThan(0);
    });

    test("should handle missing files", async () => {
      // Generate types first
      await manager.generateFromSchema(sampleSchema);

      // Delete a generated file
      const files = await fs.readdir(join(testOutputDir, "models"));
      if (files.length > 0) {
        await fs.unlink(join(testOutputDir, "models", files[0]));
      }

      // Should regenerate due to missing file
      const result = await manager.generateFromSchema(sampleSchema);
      expect(result.stats.totalFiles).toBeGreaterThan(0);
    });
  });

  describe("Integration Tests", () => {
    test("should work end-to-end with schema extraction", async () => {
      const { OpenAPISchemaExtractor } = await import("../schema/extractor");

      // Create a test FastAPI app
      const appPath = await createTestFastAPIApp();

      try {
        // Extract schema
        const extractor = new OpenAPISchemaExtractor({
          apiPath: appPath,
          port: 8012,
          timeout: 15000,
        });

        const schema = await extractor.extractSchema();

        // Generate types
        const manager = new TypeGenerationManager({
          outputDir: join(testOutputDir, "integration"),
          cleanOrphans: true,
        });

        const result = await manager.generateFromSchema(schema);

        expect(result.files.length).toBeGreaterThan(0);
        expect(result.stats.interfaces).toBeGreaterThan(0);

        // Verify generated files exist and are valid TypeScript
        for (const file of result.files) {
          const filePath = join(testOutputDir, "integration", file.path);
          const content = await fs.readFile(filePath, "utf-8");

          // Basic TypeScript syntax validation
          expect(content).toMatch(/export (interface|type|enum)/);
          expect(content).not.toContain("undefined");
        }
      } finally {
        // Cleanup test app
        await fs.unlink(appPath);
      }
    }, 30000);

    test("should handle schema watching integration", async () => {
      const manager = new TypeGenerationManager({
        outputDir: join(testOutputDir, "watching"),
        watchForChanges: true,
      });

      let generationCount = 0;
      manager.on("auto-generated", () => {
        generationCount++;
      });

      // Start with initial schema
      await manager.start(sampleSchema);

      // Wait for potential auto-generation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(generationCount).toBe(0); // No changes, no auto-generation

      await manager.stop();
    });
  });
});

// Test utilities
export async function createTestFastAPIApp(): Promise<string> {
  const testAppContent = `
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Test API", version="1.0.0")

class User(BaseModel):
    id: int
    name: str
    email: str
    age: Optional[int] = None

class CreateUserRequest(BaseModel):
    name: str
    email: str
    age: Optional[int] = None

@app.get("/users", response_model=List[User])
async def list_users():
    return []

@app.post("/users", response_model=User)
async def create_user(user: CreateUserRequest):
    return User(id=1, **user.dict())

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    return User(id=user_id, name="Test", email="test@example.com")
`;

  const tempPath = join(__dirname, "../../../__test-fixtures__/temp_app.py");
  await fs.writeFile(tempPath, testAppContent);
  return tempPath;
}

// Example generation output validation
export function validateGeneratedTypeScript(content: string): boolean {
  // Basic TypeScript validation
  const validPatterns = [
    /export (interface|type|enum) \w+/,
    /\w+: (string|number|boolean|Date|\w+\[\])/,
    /^\/\/ Auto-generated/m,
  ];

  return validPatterns.every((pattern) => pattern.test(content));
}

// Performance test
export async function performanceTest(): Promise<void> {
  console.log("🚀 Running TypeScript generation performance test...");

  const largeSchema: OpenAPISchema = {
    ...sampleSchema,
    components: {
      schemas: {},
    },
  };

  // Generate 100 model schemas
  for (let i = 0; i < 100; i++) {
    largeSchema.components!.schemas![`Model${i}`] = {
      type: "object",
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        description: { type: "string" },
        value: { type: "number" },
        active: { type: "boolean" },
        tags: { type: "array", items: { type: "string" } },
        metadata: { type: "object", additionalProperties: true },
      },
      required: ["id", "name"],
    };
  }

  const startTime = Date.now();

  const generator = new TypeScriptGenerator(largeSchema, {
    outputDir: join(__dirname, "../../../__test-output__/performance"),
    generateComments: true,
  });

  const result = await generator.generateTypes();
  const endTime = Date.now();

  console.log(
    `✅ Generated ${result.stats.totalFiles} files in ${endTime - startTime}ms`
  );
  console.log(
    `   Average: ${Math.round(
      (endTime - startTime) / result.stats.totalFiles
    )}ms per file`
  );
}
