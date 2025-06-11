import { resolve, join, dirname, basename, extname } from "path";
import { homedir } from "os";

export function resolveProjectPath(
  projectName: string,
  cwd: string = process.cwd()
): string {
  return resolve(cwd, projectName);
}

export function getConfigDir(): string {
  return join(homedir(), ".farm");
}

export function getTemplateDir(): string {
  // Resolve template path - works for both development and published package
  // In development: this file is in src/utils, templates are at ../../templates
  // In published package: this file is in dist/utils, templates are at ../../templates (package root)
  const developmentPath = resolve(__dirname, "../../templates");
  const publishedPath = resolve(__dirname, "../../../templates");

  // Try published package structure first, then fall back to development
  if (require("fs").existsSync(developmentPath)) {
    return developmentPath;
  } else if (require("fs").existsSync(publishedPath)) {
    return publishedPath;
  } else {
    // Default to development path if neither exists (will fail gracefully later)
    return developmentPath;
  }
}

export function getTempDir(): string {
  return join(getConfigDir(), "temp");
}

export function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, "/");
}

export function isSubdirectory(parent: string, child: string): boolean {
  const relative = resolve(child).replace(resolve(parent), "");
  return (
    !!relative &&
    !relative.startsWith("..") &&
    !resolve(relative).startsWith("/")
  );
}

export function ensureRelativePath(from: string, to: string): string {
  const relative = require("path").relative(from, to);
  return normalizeSlashes(relative);
}
