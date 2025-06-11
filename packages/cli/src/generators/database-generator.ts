import path from "path";
import fs from "fs-extra";
import { TemplateProcessor } from "../template/processor.js";
import { DatabaseProvider, DatabaseType } from "@farm-framework/types";
import { logger } from "../utils/logger.js";

const DOCKER_TEMPLATE = "docker-compose.database.yml";

export class DatabaseGenerator {
  constructor(
    private provider: DatabaseProvider,
    private processor: TemplateProcessor = new TemplateProcessor()
  ) {}
  async generateDatabaseConfig(projectPath: string): Promise<void> {
    const { type } = this.provider;
    logger.info(`Scaffolding database files for ${type}...`);

    // Core templates
    const templateDir = `base/database/${type}`;

    // Create a minimal context with required properties
    const context = {
      projectName: "temp-project", // Will be overridden by actual context
      features: [],
      database: this.provider.type, // Use the string type, not the object
      answers: {},
      timestamp: new Date().toISOString(),
      farmVersion: "1.0.0",
      template: "basic", // Default template
      name: "temp-project", // Legacy field name
    };

    await this.processor.processTemplate(templateDir, context, projectPath);

    // Optional migration config
    if (this.provider.templateConfig.migrationSupport) {
      await this.generateMigrationConfig(projectPath, type);
    }

    // Docker compose patch
    await this.updateDockerCompose(projectPath);
  }

  private async generateMigrationConfig(
    outputPath: string,
    type: DatabaseType
  ): Promise<void> {
    if (type !== "postgresql") return;

    const migrationsDir = path.join(outputPath, "migrations");
    await fs.ensureDir(migrationsDir);

    const configPath = path.join(migrationsDir, "alembic.ini");
    const envPath = path.join(migrationsDir, "env.py");
    if (!(await fs.pathExists(configPath))) {
      const context = {
        projectName: "temp-project",
        features: [],
        database: this.provider.type,
        answers: {},
        timestamp: new Date().toISOString(),
        farmVersion: "1.0.0",
        template: "basic", // Default template
        name: "temp-project", // Legacy field name
      };
      await this.processor.processTemplate(
        "base/database/postgresql/alembic.ini.hbs",
        context,
        migrationsDir
      );
    }
    if (!(await fs.pathExists(envPath))) {
      const context = {
        projectName: "temp-project",
        features: [],
        database: this.provider.type,
        answers: {},
        timestamp: new Date().toISOString(),
        farmVersion: "1.0.0",
        template: "basic", // Default template
        name: "temp-project", // Legacy field name
      };
      await this.processor.processTemplate(
        "base/database/postgresql/env.py.hbs",
        context,
        migrationsDir
      );
    }
  }
  private async updateDockerCompose(outputPath: string): Promise<void> {
    try {
      const context = {
        projectName: "temp-project",
        features: [],
        database: this.provider.type,
        answers: {},
        timestamp: new Date().toISOString(),
        farmVersion: "1.0.0",
        template: "basic", // Default template
        name: "temp-project", // Legacy field name
      };
      await this.processor.processTemplate(
        `base/${DOCKER_TEMPLATE}`,
        context,
        outputPath
      );
    } catch (error) {
      logger.warn(
        "Failed to update docker-compose.yml: " + (error as Error).message
      );
    }
  }
}
