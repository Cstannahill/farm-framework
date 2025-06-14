#!/usr/bin/env node
/**
 * Automated Frontend Dependency Management Tool with Inheritance Support
 *
 * This script helps maintain and update frontend dependencies across all templates
 * following the inheritance architecture where base template contains core deps
 * and individual templates only add their specific dependencies.
 *
 * Key Features:
 * - Validates inheritance compliance (no core deps in templates)
 * - Updates base template with latest core dependency versions
 * - Updates template-specific dependencies only
 * - Detects and removes inheritance violations
 * - Generates dependency reports
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.join(__dirname, "../../packages/cli/templates");
const BASE_TEMPLATE_PKG = path.join(
  TEMPLATES_DIR,
  "base/apps/web/package.json.hbs"
);

// Core dependencies that should ONLY be in base template and inherited by all
const CORE_DEPENDENCIES = [
  "react",
  "react-dom",
  "react-router-dom",
  "@tanstack/react-query",
  "zustand",
  "clsx",
  "tailwind-merge",
  "lucide-react",
];

const CORE_DEV_DEPENDENCIES = [
  "@types/react",
  "@types/react-dom",
  "@typescript-eslint/eslint-plugin",
  "@typescript-eslint/parser",
  "@vitejs/plugin-react",
  "autoprefixer",
  "eslint",
  "@eslint/js",
  "globals",
  "eslint-plugin-react-hooks",
  "eslint-plugin-react-refresh",
  "postcss",
  "tailwindcss",
  "typescript",
  "vite",
  "@tsconfig/node20",
];

// Template-specific dependencies that should NOT be in base
const TEMPLATE_SPECIFIC_DEPS = {
  "ai-chat": {
    dependencies: [
      "framer-motion",
      "react-markdown",
      "remark-gfm",
      "react-syntax-highlighter",
      "marked",
      "eventsource-parser",
    ],
    devDependencies: ["@types/react-syntax-highlighter"],
  },
  "ai-dashboard": {
    dependencies: ["recharts", "date-fns", "react-window"],
    devDependencies: ["@types/react-window"],
  },
  ecommerce: {
    dependencies: [
      "@stripe/stripe-js",
      "@stripe/react-stripe-js",
      "react-hook-form",
      "yup",
      "@hookform/resolvers",
    ],
    devDependencies: [],
  },
  cms: {
    dependencies: [
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-placeholder",
      "@tiptap/extension-character-count",
      "react-beautiful-dnd",
    ],
    devDependencies: ["@types/react-beautiful-dnd"],
  },
};

/**
 * Get latest version of an npm package
 */
function getLatestVersion(packageName) {
  try {
    const result = execSync(`npm view ${packageName} version`, {
      encoding: "utf8",
    });
    return result.trim();
  } catch (error) {
    console.warn(
      `⚠️  Could not get version for ${packageName}: ${error.message}`
    );
    return null;
  }
}

/**
 * Read and parse a package.json.hbs file
 */
function readPackageJson(filePath) {
  console.log(`🔍 [readPackageJson] Starting to parse: ${filePath}`);

  try {
    console.log(`📖 [readPackageJson] Reading file content...`);
    const content = fs.readFileSync(filePath, "utf8");
    console.log(
      `📖 [readPackageJson] File read successfully. Content length: ${content.length} characters`
    );
    console.log(
      `📖 [readPackageJson] First 200 chars: ${content.substring(0, 200)}...`
    );

    // Remove handlebars comments and replace template variables with placeholders
    console.log(`🧹 [readPackageJson] Starting cleanup...`);
    let cleanContent = content
      .replace(/{{!.*?}}/g, "") // Remove comments
      .replace(/{{projectName}}/g, "template-project")
      .replace(/{{projectNameKebab}}/g, "template-project")
      .replace(/{{name}}/g, "template-project") // Handle {{name}} variant
      .replace(/{{version}}/g, "0.1.0")
      .replace(/{{description}}/g, "Template description")
      // Handle feature conditionals - remove everything between the tags
      .replace(/{{#if_feature\s+"[^"]*"}}[^{]*?{{\/if_feature}}/gs, "")
      .replace(/{{#if\s+[^}]+}}[^{]*?{{\/if}}/gs, "") // Remove other conditionals
      .replace(/{{#unless\s+[^}]+}}[^{]*?{{\/unless}}/gs, "")
      .replace(/{{.*?}}/g, '"template-var"') // Replace remaining variables
      .replace(/,(\s*[}\]])/g, "$1") // Clean up trailing commas before } or ]
      .replace(/,\s*,/g, ",") // Remove duplicate commas
      .trim();
    console.log(
      `🧹 [readPackageJson] After cleanup, length: ${cleanContent.length}`
    );
    console.log(
      `🧹 [readPackageJson] Cleaned content preview: ${cleanContent.substring(0, 300)}...`
    );

    console.log(`🔍 [readPackageJson] Attempting JSON parse...`);
    const parsed = JSON.parse(cleanContent);
    console.log(`✅ [readPackageJson] JSON parsed successfully!`);

    console.log(`✅ [readPackageJson] Package name: ${parsed.name}`);
    console.log(
      `✅ [readPackageJson] Dependencies count: ${Object.keys(parsed.dependencies || {}).length}`
    );
    console.log(
      `✅ [readPackageJson] DevDependencies count: ${Object.keys(parsed.devDependencies || {}).length}`
    );

    return parsed;
  } catch (error) {
    console.error(
      `⚠️  [readPackageJson] Failed to parse ${filePath} - continuing...`
    );
    console.error(`⚠️  [readPackageJson] Error: ${error.message}`);

    if (process.env.VERBOSE === "true") {
      console.error(`⚠️  [readPackageJson] Error stack: ${error.stack}`);

      // Try to show more debugging info
      try {
        const rawContent = fs.readFileSync(filePath, "utf8");
        console.error(
          `⚠️  [readPackageJson] Original content preview: ${rawContent.substring(0, 400)}...`
        );
      } catch (readError) {
        console.error(
          `⚠️  [readPackageJson] Could not re-read file: ${readError.message}`
        );
      }
    }

    console.warn(
      `⚠️  Could not process ${filePath}: ${error.message} - skipping this file...`
    );
    return null;
  }
}

/**
 * Write package.json.hbs file with handlebars comment
 */
function writePackageJson(filePath, packageObj) {
  const comment = `{{! filepath: ${filePath.replace(/\\/g, "/")} }}`;
  const content = comment + "\n" + JSON.stringify(packageObj, null, 2);
  fs.writeFileSync(filePath, content);
}

/**
 * Update base template with latest versions of core dependencies
 */
async function updateBaseTemplate() {
  console.log("🔄 Updating base template dependencies...");

  const basePkg = readPackageJson(BASE_TEMPLATE_PKG);
  if (!basePkg) {
    console.warn(
      "⚠️  Could not read base template package.json - skipping base update"
    );
    return;
  }

  let updated = false;
  const updateErrors = [];

  // Update core dependencies
  console.log("📦 Checking core dependencies...");
  for (const dep of CORE_DEPENDENCIES) {
    try {
      const latestVersion = getLatestVersion(dep);
      if (latestVersion) {
        const currentVersion = basePkg.dependencies[dep];
        const newVersion = `^${latestVersion}`;
        if (currentVersion !== newVersion) {
          console.log(`  📦 ${dep}: ${currentVersion} → ${newVersion}`);
          basePkg.dependencies[dep] = newVersion;
          updated = true;
        }
      } else {
        updateErrors.push(`Could not get latest version for ${dep}`);
      }
    } catch (error) {
      updateErrors.push(`Error updating ${dep}: ${error.message}`);
      console.warn(
        `⚠️  Could not update ${dep}: ${error.message} - continuing...`
      );
    }
  }

  // Update core dev dependencies
  console.log("🛠️  Checking core dev dependencies...");
  for (const dep of CORE_DEV_DEPENDENCIES) {
    try {
      const latestVersion = getLatestVersion(dep);
      if (latestVersion) {
        const currentVersion = basePkg.devDependencies[dep];
        const newVersion = `^${latestVersion}`;
        if (currentVersion !== newVersion) {
          console.log(`  🛠️  ${dep}: ${currentVersion} → ${newVersion}`);
          basePkg.devDependencies[dep] = newVersion;
          updated = true;
        }
      } else {
        updateErrors.push(`Could not get latest version for ${dep}`);
      }
    } catch (error) {
      updateErrors.push(`Error updating ${dep}: ${error.message}`);
      console.warn(
        `⚠️  Could not update ${dep}: ${error.message} - continuing...`
      );
    }
  }

  if (updated) {
    try {
      writePackageJson(BASE_TEMPLATE_PKG, basePkg);
      console.log("✅ Base template updated");
    } catch (error) {
      console.error(`❌ Failed to write base template: ${error.message}`);
      updateErrors.push(`Failed to write base template: ${error.message}`);
    }
  } else {
    console.log("✅ Base template already up to date");
  }

  if (updateErrors.length > 0) {
    console.log(
      `⚠️  ${updateErrors.length} errors occurred during base template update:`
    );
    updateErrors.forEach((error) => console.log(`   - ${error}`));
  }
}

/**
 * Update a specific template's dependencies following inheritance model
 */
async function updateTemplateSpecificDeps(templateName) {
  const templatePkgPath = path.join(
    TEMPLATES_DIR,
    templateName,
    "apps/web/package.json.hbs"
  );

  if (!fs.existsSync(templatePkgPath)) {
    console.log(`⚠️  No package.json found for ${templateName} template`);
    return;
  }

  console.log(`🔄 Updating ${templateName} template dependencies...`);

  const templatePkg = readPackageJson(templatePkgPath);
  if (!templatePkg) return;

  const basePkg = readPackageJson(BASE_TEMPLATE_PKG);
  if (!basePkg) return;

  let updated = false;

  // INHERITANCE MODEL: Only check template-specific dependencies
  // Core dependencies should only exist in base template
  const specificDeps = TEMPLATE_SPECIFIC_DEPS[templateName];
  if (specificDeps) {
    // Update template-specific dependencies
    for (const dep of specificDeps.dependencies) {
      const latestVersion = getLatestVersion(dep);
      if (latestVersion) {
        const currentVersion = templatePkg.dependencies[dep];
        const newVersion = `^${latestVersion}`;
        if (currentVersion !== newVersion) {
          console.log(`  📦 ${dep}: ${currentVersion} → ${newVersion}`);
          templatePkg.dependencies[dep] = newVersion;
          updated = true;
        }
      }
    }

    // Update template-specific dev dependencies
    for (const dep of specificDeps.devDependencies) {
      const latestVersion = getLatestVersion(dep);
      if (latestVersion) {
        const currentVersion = templatePkg.devDependencies?.[dep];
        const newVersion = `^${latestVersion}`;
        if (currentVersion !== newVersion) {
          console.log(`  🛠️  ${dep}: ${currentVersion} → ${newVersion}`);
          if (!templatePkg.devDependencies) templatePkg.devDependencies = {};
          templatePkg.devDependencies[dep] = newVersion;
          updated = true;
        }
      }
    }
  }

  // Check for core dependencies that shouldn't be in template
  const conflictingCoreDeps = CORE_DEPENDENCIES.filter(
    (dep) => templatePkg.dependencies && templatePkg.dependencies[dep]
  );

  if (conflictingCoreDeps.length > 0) {
    console.log(
      `  ⚠️  Found core dependencies in template (should be inherited from base):`
    );
    conflictingCoreDeps.forEach((dep) => {
      console.log(`    - ${dep}: ${templatePkg.dependencies[dep]}`);
      delete templatePkg.dependencies[dep];
      updated = true;
    });
  }

  // Check for core dev dependencies that shouldn't be in template
  const conflictingCoreDevDeps = CORE_DEV_DEPENDENCIES.filter(
    (dep) => templatePkg.devDependencies && templatePkg.devDependencies[dep]
  );

  if (conflictingCoreDevDeps.length > 0) {
    console.log(
      `  ⚠️  Found core dev dependencies in template (should be inherited from base):`
    );
    conflictingCoreDevDeps.forEach((dep) => {
      console.log(`    - ${dep}: ${templatePkg.devDependencies[dep]}`);
      delete templatePkg.devDependencies[dep];
      updated = true;
    });
  }

  if (updated) {
    writePackageJson(templatePkgPath, templatePkg);
    console.log(`✅ ${templateName} template updated`);
  } else {
    console.log(`✅ ${templateName} template already up to date`);
  }
}

/**
 * Check for dependency conflicts across templates using inheritance model
 */
function checkConflicts() {
  console.log("🔍 [checkConflicts] Starting dependency conflict check...");

  const conflicts = new Map();
  const templateDirs = fs
    .readdirSync(TEMPLATES_DIR)
    .filter((dir) => {
      const isDir = fs.statSync(path.join(TEMPLATES_DIR, dir)).isDirectory();
      console.log(
        `🔍 [checkConflicts] Found directory: ${dir}, isDirectory: ${isDir}`
      );
      return isDir;
    })
    .filter((dir) => {
      const shouldInclude = dir !== "base" && dir !== "features";
      console.log(
        `🔍 [checkConflicts] Directory ${dir}, shouldInclude: ${shouldInclude}`
      );
      return shouldInclude;
    });

  console.log(
    `🔍 [checkConflicts] Template directories to check: ${templateDirs.join(", ")}`
  );

  // Check base template first
  console.log(
    `🔍 [checkConflicts] Checking base template: ${BASE_TEMPLATE_PKG}`
  );
  const basePkg = readPackageJson(BASE_TEMPLATE_PKG);
  if (basePkg) {
    console.log(`✅ [checkConflicts] Base template loaded successfully`);
    Object.entries(basePkg.dependencies || {}).forEach(([dep, version]) => {
      if (!conflicts.has(dep)) conflicts.set(dep, new Map());
      conflicts.get(dep).set("base", version);
    });
    console.log(
      `✅ [checkConflicts] Base template has ${Object.keys(basePkg.dependencies || {}).length} dependencies`
    );
  } else {
    console.error(`❌ [checkConflicts] Failed to load base template`);
  }

  // Check individual templates (should only have template-specific deps)
  console.log(`🔍 [checkConflicts] Checking individual templates...`);
  for (const template of templateDirs) {
    console.log(`🔍 [checkConflicts] Checking template: ${template}`);
    const pkgPath = path.join(
      TEMPLATES_DIR,
      template,
      "apps/web/package.json.hbs"
    );
    console.log(`🔍 [checkConflicts] Template package path: ${pkgPath}`);
    console.log(`🔍 [checkConflicts] File exists: ${fs.existsSync(pkgPath)}`);

    if (fs.existsSync(pkgPath)) {
      const pkg = readPackageJson(pkgPath);
      if (pkg) {
        console.log(
          `✅ [checkConflicts] Template ${template} loaded successfully`
        );
        console.log(
          `✅ [checkConflicts] Template ${template} has ${Object.keys(pkg.dependencies || {}).length} dependencies`
        );

        // Check dependencies
        Object.entries(pkg.dependencies || {}).forEach(([dep, version]) => {
          if (!conflicts.has(dep)) conflicts.set(dep, new Map());
          conflicts.get(dep).set(template, version);

          // Flag if template has core dependency (inheritance violation)
          if (CORE_DEPENDENCIES.includes(dep)) {
            console.log(
              `  ⚠️  [checkConflicts] Template ${template} has core dependency ${dep} (should inherit from base)`
            );
          }
        });
      } else {
        console.error(
          `❌ [checkConflicts] Failed to load template ${template}`
        );
      }
    } else {
      console.log(
        `⚠️  [checkConflicts] No package.json found for template ${template}`
      );
    }
  }

  console.log(`🔍 [checkConflicts] Analyzing conflicts...`);
  let hasConflicts = false;
  let hasInheritanceViolations = false;

  for (const [dep, templateVersions] of conflicts) {
    const versions = new Set(templateVersions.values());
    if (versions.size > 1) {
      hasConflicts = true;
      console.log(`⚠️  [checkConflicts] Version conflict in ${dep}:`);
      for (const [template, version] of templateVersions) {
        console.log(`    ${template}: ${version}`);
      }
    }

    // Check for inheritance violations
    if (CORE_DEPENDENCIES.includes(dep)) {
      const templatesWithCoreDep = Array.from(templateVersions.keys()).filter(
        (t) => t !== "base"
      );
      if (templatesWithCoreDep.length > 0) {
        hasInheritanceViolations = true;
        console.log(
          `  🚨 Core dependency ${dep} found in templates: ${templatesWithCoreDep.join(", ")}`
        );
      }
    }
  }

  if (!hasConflicts && !hasInheritanceViolations) {
    console.log("✅ No dependency conflicts or inheritance violations found");
  } else if (hasInheritanceViolations) {
    console.log(
      "🔧 Run 'npm run clean-template-deps' to fix inheritance violations"
    );
  }
}

/**
 * Generate dependency report
 */
function generateReport() {
  console.log("📊 Generating dependency report...");

  const report = {
    timestamp: new Date().toISOString(),
    base: {},
    templates: {},
  };

  // Base template
  const basePkg = readPackageJson(BASE_TEMPLATE_PKG);
  if (basePkg) {
    report.base = {
      dependencies: Object.keys(basePkg.dependencies || {}),
      devDependencies: Object.keys(basePkg.devDependencies || {}),
    };
  }

  // Individual templates
  const templateDirs = fs
    .readdirSync(TEMPLATES_DIR)
    .filter(
      (dir) =>
        fs.statSync(path.join(TEMPLATES_DIR, dir)).isDirectory() &&
        dir !== "base"
    );

  for (const template of templateDirs) {
    const pkgPath = path.join(
      TEMPLATES_DIR,
      template,
      "apps/web/package.json.hbs"
    );
    if (fs.existsSync(pkgPath)) {
      const pkg = readPackageJson(pkgPath);
      if (pkg) {
        report.templates[template] = {
          dependencies: Object.keys(pkg.dependencies || {}),
          devDependencies: Object.keys(pkg.devDependencies || {}),
        };
      }
    }
  }

  const reportPath = path.join(__dirname, "../docs/DEPENDENCY_REPORT.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`✅ Report saved to ${reportPath}`);
}

/**
 * Main function
 */
async function main() {
  console.log("🚀 [main] Starting Frontend Dependency Management Tool...");
  console.log(`🚀 [main] Process arguments: ${JSON.stringify(process.argv)}`);
  console.log(`🚀 [main] Working directory: ${process.cwd()}`);
  console.log(`🚀 [main] Script file: ${process.argv[1]}`);
  console.log(`🚀 [main] import.meta.url: ${import.meta.url}`);

  const command = process.argv[2];
  console.log(`🚀 [main] Command received: "${command}"`);

  switch (command) {
    case "update":
      console.log("🔄 [main] Executing UPDATE command...");
      await updateBaseTemplate();
      const templates = [
        "basic",
        "ai-chat",
        "ai-dashboard",
        "ecommerce",
        "cms",
      ];
      console.log(`🔄 [main] Will update templates: ${templates.join(", ")}`);
      for (const template of templates) {
        console.log(`🔄 [main] Updating template: ${template}`);
        await updateTemplateSpecificDeps(template);
      }
      console.log("✅ [main] UPDATE command completed");
      break;

    case "check":
      console.log("🔍 [main] Executing CHECK command...");
      checkConflicts();
      console.log("✅ [main] CHECK command completed");
      break;

    case "report":
      console.log("📊 [main] Executing REPORT command...");
      generateReport();
      console.log("✅ [main] REPORT command completed");
      break;

    default:
      console.log("❓ [main] No valid command provided, showing help...");
      console.log(`
Frontend Dependency Management Tool

Usage:
  node scripts/manage-frontend-deps.js <command>

Commands:
  update   Update all templates with latest dependency versions
  check    Check for dependency conflicts across templates  
  report   Generate dependency usage report

Examples:
  node scripts/manage-frontend-deps.js update
  node scripts/manage-frontend-deps.js check
  node scripts/manage-frontend-deps.js report
`);
  }

  console.log("🏁 [main] Main function execution completed");
}

// Enhanced entry point detection and logging
console.log(
  "🔍 [entry] Script loaded, checking if this is the main entry point..."
);
console.log(`🔍 [entry] import.meta.url: ${import.meta.url}`);
console.log(`🔍 [entry] process.argv[1]: ${process.argv[1]}`);
console.log(
  `🔍 [entry] Resolved process.argv[1]: ${path.resolve(process.argv[1])}`
);

const scriptPath = fileURLToPath(import.meta.url);
const executedPath = path.resolve(process.argv[1]);
console.log(`🔍 [entry] Script path: ${scriptPath}`);
console.log(`🔍 [entry] Executed path: ${executedPath}`);
console.log(`🔍 [entry] Paths match: ${scriptPath === executedPath}`);

// Only run main if this is the entry point
if (scriptPath === executedPath) {
  console.log("🚀 [entry] This IS the main entry point, starting main()...");
  main().catch((error) => {
    console.error("💥 [main] Error in main function:", error);
    console.error("💥 [main] Error stack:", error.stack);
    console.error(
      "⚠️  Script encountered an error but some operations may have completed successfully."
    );
    console.error(
      "💡 You can try running the script again or check individual templates manually."
    );
    process.exit(1);
  });
} else {
  console.log(
    "📦 [entry] This is NOT the main entry point (imported as module)"
  );
}

export {
  updateBaseTemplate,
  updateTemplateSpecificDeps,
  checkConflicts,
  generateReport,
};
