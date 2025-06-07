// packages/cli/src/utils/debug-generator.ts
// Temporary debug utility to understand the ProjectFileGenerator interface

import { ProjectFileGenerator } from "../generators/project-file-generator.js";

/**
 * Debug utility to inspect the ProjectFileGenerator interface
 * Use this to understand what methods are available and their signatures
 */
export function debugGeneratorInterface() {
  const generator = new ProjectFileGenerator();

  console.log("🔍 Debugging ProjectFileGenerator interface:");
  console.log("==========================================");

  // Get all methods on the instance
  const instanceMethods = Object.getOwnPropertyNames(generator).filter(
    (name) => typeof (generator as any)[name] === "function"
  );

  // Get all methods on the prototype
  const prototypeMethods = Object.getOwnPropertyNames(
    Object.getPrototypeOf(generator)
  ).filter(
    (name) =>
      typeof (generator as any)[name] === "function" && name !== "constructor"
  );

  console.log("Instance methods:", instanceMethods);
  console.log("Prototype methods:", prototypeMethods);

  // Check for common method patterns
  const commonMethods = [
    "generate",
    "generateFromTemplate",
    "generateProject",
    "createFiles",
    "createProject",
    "build",
    "render",
  ];

  console.log("\nChecking for common method patterns:");
  commonMethods.forEach((methodName) => {
    if (typeof (generator as any)[methodName] === "function") {
      console.log(`✅ Has method: ${methodName}`);

      // Try to get function signature info
      const method = (generator as any)[methodName];
      console.log(`   - Function length (param count): ${method.length}`);
      console.log(
        `   - Function string: ${method.toString().split("\n")[0]}...`
      );
    } else {
      console.log(`❌ Missing method: ${methodName}`);
    }
  });

  console.log("\n🔍 Full object inspection:");
  console.log(
    "Methods available on generator:",
    [...instanceMethods, ...prototypeMethods].filter(
      (v, i, a) => a.indexOf(v) === i
    )
  );

  return generator;
}

/**
 * Test the adapter with debug information
 */
export async function testGeneratorWithAdapter() {
  const { FileGeneratorAdapter } = await import(
    "../generators/file-generator-adapter.js"
  );
  const generator = debugGeneratorInterface();

  console.log("\n🧪 Testing adapter compatibility:");
  console.log("=================================");

  const adapter = new FileGeneratorAdapter(generator as any);
  const availableMethods = adapter.getAvailableMethods();

  console.log("Available methods through adapter:", availableMethods);

  // Test context conversion
  const mockContext = {
    name: "test-project",
    template: "basic" as const,
    features: ["auth"] as any, // Cast to any to avoid readonly error for debugging
    database: "mongodb" as const,
    typescript: true,
    docker: true,
    testing: true,
    git: true,
    install: true,
    interactive: true,
    verbose: true,
  };

  console.log("\n🔄 Testing context conversion:");
  const converted = adapter.debugConvertedConfig(mockContext as any);

  return { generator, adapter, converted };
}

// Usage in create command for debugging:
// import { debugGeneratorInterface, testGeneratorWithAdapter } from "../utils/debug-generator.js";
//
// // Add this before the actual generation call:
// if (normalizedOptions.verbose) {
//   await testGeneratorWithAdapter();
// }
