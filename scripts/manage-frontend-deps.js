#!/usr/bin/env node
/**
 * Automated Frontend Dependency Management Tool
 *
 * This script helps maintain and update frontend dependencies across all templates
 * following the inheritance architecture where base template contains core deps
 * and individual templates only add their specific dependencies.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.join(__dirname, "../packages/cli/templates");
const BASE_TEMPLATE_PKG = path.join(
  TEMPLATES_DIR,
  "base/apps/web/package.json.hbs"
);

// Core dependencies that should be in base template and inherited by all
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
    console.warn(`Warning: Could not get version for ${packageName}`);
    return null;
  }
}

/**
 * Read and parse a package.json.hbs file
 */
function readPackageJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    // Remove handlebars comments and replace template variables with placeholders
    let cleanContent = content
      .replace(/{{!.*?}}/g, "") // Remove comments
      .replace(/{{.*?}}/g, '"PLACEHOLDER"') // Replace handlebars variables
      .trim();

    const parsed = JSON.parse(cleanContent);

    // Convert back placeholders to reasonable values for processing
    if (parsed.name === "PLACEHOLDER") {
      parsed.name = "template-web";
    }

    return parsed;
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}:`, error.message);
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
  if (!basePkg) return;

  let updated = false;

  // Update core dependencies
  for (const dep of CORE_DEPENDENCIES) {
    const latestVersion = getLatestVersion(dep);
    if (latestVersion) {
      const currentVersion = basePkg.dependencies[dep];
      const newVersion = `^${latestVersion}`;
      if (currentVersion !== newVersion) {
        console.log(`  📦 ${dep}: ${currentVersion} → ${newVersion}`);
        basePkg.dependencies[dep] = newVersion;
        updated = true;
      }
    }
  }

  // Update core dev dependencies
  for (const dep of CORE_DEV_DEPENDENCIES) {
    const latestVersion = getLatestVersion(dep);
    if (latestVersion) {
      const currentVersion = basePkg.devDependencies[dep];
      const newVersion = `^${latestVersion}`;
      if (currentVersion !== newVersion) {
        console.log(`  🛠️  ${dep}: ${currentVersion} → ${newVersion}`);
        basePkg.devDependencies[dep] = newVersion;
        updated = true;
      }
    }
  }

  if (updated) {
    writePackageJson(BASE_TEMPLATE_PKG, basePkg);
    console.log("✅ Base template updated");
  } else {
    console.log("✅ Base template already up to date");
  }
}

/**
 * Update a specific template's dependencies
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

  // Ensure all core dependencies match base template
  for (const dep of CORE_DEPENDENCIES) {
    if (
      basePkg.dependencies[dep] &&
      templatePkg.dependencies[dep] !== basePkg.dependencies[dep]
    ) {
      console.log(`  🔄 Syncing ${dep} with base template`);
      templatePkg.dependencies[dep] = basePkg.dependencies[dep];
      updated = true;
    }
  }

  // Update template-specific dependencies
  const specificDeps = TEMPLATE_SPECIFIC_DEPS[templateName];
  if (specificDeps) {
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
  }

  // Sync all core dev dependencies with base
  for (const dep of CORE_DEV_DEPENDENCIES) {
    if (
      basePkg.devDependencies[dep] &&
      templatePkg.devDependencies[dep] !== basePkg.devDependencies[dep]
    ) {
      console.log(`  🔄 Syncing ${dep} with base template`);
      templatePkg.devDependencies[dep] = basePkg.devDependencies[dep];
      updated = true;
    }
  }

  if (updated) {
    writePackageJson(templatePkgPath, templatePkg);
    console.log(`✅ ${templateName} template updated`);
  } else {
    console.log(`✅ ${templateName} template already up to date`);
  }
}

/**
 * Check for dependency conflicts across templates
 */
function checkConflicts() {
  console.log("🔍 Checking for dependency conflicts...");

  const conflicts = new Map();
  const templateDirs = fs
    .readdirSync(TEMPLATES_DIR)
    .filter((dir) => fs.statSync(path.join(TEMPLATES_DIR, dir)).isDirectory());

  for (const template of templateDirs) {
    const pkgPath = path.join(
      TEMPLATES_DIR,
      template,
      "apps/web/package.json.hbs"
    );
    if (fs.existsSync(pkgPath)) {
      const pkg = readPackageJson(pkgPath);
      if (pkg) {
        // Check dependencies
        Object.entries(pkg.dependencies || {}).forEach(([dep, version]) => {
          if (!conflicts.has(dep)) conflicts.set(dep, new Map());
          conflicts.get(dep).set(template, version);
        });
      }
    }
  }

  let hasConflicts = false;
  for (const [dep, templateVersions] of conflicts) {
    const versions = new Set(templateVersions.values());
    if (versions.size > 1) {
      hasConflicts = true;
      console.log(`⚠️  Conflict in ${dep}:`);
      for (const [template, version] of templateVersions) {
        console.log(`    ${template}: ${version}`);
      }
    }
  }

  if (!hasConflicts) {
    console.log("✅ No dependency conflicts found");
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
  const command = process.argv[2];

  switch (command) {
    case "update":
      await updateBaseTemplate();
      const templates = [
        "basic",
        "ai-chat",
        "ai-dashboard",
        "ecommerce",
        "cms",
      ];
      for (const template of templates) {
        await updateTemplateSpecificDeps(template);
      }
      break;

    case "check":
      checkConflicts();
      break;

    case "report":
      generateReport();
      break;

    default:
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
}

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  updateBaseTemplate,
  updateTemplateSpecificDeps,
  checkConflicts,
  generateReport,
};
