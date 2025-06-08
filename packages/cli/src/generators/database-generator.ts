import path from "path";
import fs from "fs-extra";
import { TemplateProcessor } from "../template/processor.js";
import { DatabaseProvider, DatabaseType } from "@farm/types";
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
    await this.processor.processTemplate(
      templateDir,
      { database: this.provider },
      projectPath
    );

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
      await this.processor.processTemplate(
        "base/database/postgresql/alembic.ini.hbs",
        { database: this.provider },
        migrationsDir
      );
    }

    if (!(await fs.pathExists(envPath))) {
      await this.processor.processTemplate(
        "base/database/postgresql/env.py.hbs",
        { database: this.provider },
        migrationsDir
      );
    }
  }

  private async updateDockerCompose(outputPath: string): Promise<void> {
    try {
      await this.processor.processTemplate(
        `base/${DOCKER_TEMPLATE}`,
        { database: this.provider },
        outputPath
      );
    } catch (error) {
      logger.warn("Failed to update docker-compose.yml: " + (error as Error).message);
    }
  }
}
