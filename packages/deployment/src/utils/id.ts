import { randomBytes } from "crypto";

/**
 * Generate a unique deployment ID
 */
export function generateId(): string {
  return randomBytes(8).toString("hex");
}

/**
 * Generate a deployment name with timestamp
 */
export function generateDeploymentName(prefix: string = "deploy"): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const id = randomBytes(4).toString("hex");
  return `${prefix}-${timestamp}-${id}`;
}

/**
 * Generate a build ID
 */
export function generateBuildId(): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString("hex");
  return `build-${timestamp}-${random}`;
}
