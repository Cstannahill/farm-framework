// src/scaffolding/scaffolder.ts
import { ProjectGenerator } from "../template/generator.js";
import { TemplateContext, GenerationResult } from "../template/types.js";

export class ProjectScaffolder {
  private generator: ProjectGenerator;

  constructor() {
    this.generator = new ProjectGenerator();
  }

  async generateProject(context: TemplateContext): Promise<GenerationResult> {
    return await this.generator.generateProject(context);
  }

  async validateProject(
    context: TemplateContext
  ): Promise<{ valid: boolean; errors: string[] }> {
    // Validate project context without actually generating
    const errors: string[] = [];

    // Check if project directory already exists
    try {
      const fs = await import("fs/promises");
      await fs.access(context.projectName);
      errors.push(`Directory '${context.projectName}' already exists`);
    } catch {
      // Directory doesn't exist, which is good
    }

    // Add other validation logic here

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
