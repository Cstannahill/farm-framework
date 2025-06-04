import { FarmError } from "../core/errors.js";

export function validateProjectName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new FarmError("Project name is required", "VALIDATION_ERROR");
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    throw new FarmError(
      "Project name can only contain letters, numbers, hyphens, and underscores",
      "VALIDATION_ERROR"
    );
  }

  if (name.startsWith("-") || name.startsWith("_")) {
    throw new FarmError(
      "Project name cannot start with a hyphen or underscore",
      "VALIDATION_ERROR"
    );
  }

  if (name.length > 50) {
    throw new FarmError(
      "Project name cannot be longer than 50 characters",
      "VALIDATION_ERROR"
    );
  }
}

export function validateTemplate(template: string): void {
  const validTemplates = [
    "basic",
    "ai-chat",
    "ai-dashboard",
    "ecommerce",
    "cms",
    "api-only",
  ];

  if (!validTemplates.includes(template)) {
    throw new FarmError(
      `Invalid template '${template}'. Valid templates: ${validTemplates.join(
        ", "
      )}`,
      "VALIDATION_ERROR"
    );
  }
}

export function validateFeatures(features: string[]): void {
  const validFeatures = [
    "auth",
    "ai",
    "realtime",
    "payments",
    "email",
    "storage",
    "search",
    "analytics",
  ];
  const invalidFeatures = features.filter((f) => !validFeatures.includes(f));

  if (invalidFeatures.length > 0) {
    throw new FarmError(
      `Invalid features: ${invalidFeatures.join(
        ", "
      )}. Valid features: ${validFeatures.join(", ")}`,
      "VALIDATION_ERROR"
    );
  }
}
