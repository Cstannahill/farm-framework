import { fileURLToPath } from "url";
import { dirname } from "path";

/**
 * Returns the directory of the ES‑module whose import.meta.url you pass in.
 *
 * Usage:
 *   const __dirname = moduleDirname(import.meta.url);
 */
export function moduleDirname(metaUrl: string): string {
  return dirname(fileURLToPath(metaUrl));
}
