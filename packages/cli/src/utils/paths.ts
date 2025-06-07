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
  // This will point to the templates directory in the framework
  return resolve(__dirname, "../../../templates");
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
