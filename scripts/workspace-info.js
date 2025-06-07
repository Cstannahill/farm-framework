#!/usr/bin/env node

const { execSync } = require("child_process");

console.log("🌾 FARM Framework Workspace Info\n");

try {
  // Show workspace packages
  const workspaces = execSync("pnpm list -r --depth=0 --json", {
    encoding: "utf8",
  });
  const packages = JSON.parse(workspaces);

  console.log("📦 Workspace Packages:");
  packages.forEach((pkg) => {
    if (pkg.name !== "farm-framework") {
      console.log(`  ${pkg.name}@${pkg.version} (${pkg.path})`);
    }
  });

  console.log("\n🔗 Dependencies:");
  execSync("pnpm list -r --depth=1", { stdio: "inherit" });
} catch (error) {
  console.error("Error getting workspace info:", error.message);
}
