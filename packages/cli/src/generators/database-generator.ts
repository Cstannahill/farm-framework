import path from "path";
import fs from "fs-extra";
import { TemplateProcessor } from "../template/processor.js";
import { DatabaseProvider, DatabaseType } from "@farm/types";
import { logger } from "../utils/logger.js";

export class DatabaseGenerator {
  constructor(
    private provider: DatabaseProvider,
    private processor: TemplateProcessor = new TemplateProcessor()
  ) {}

  async generateDatabaseConfig(projectPath: string): Promise<void> {
    const { type } = this.provider;
    logger.info(`Scaffolding database files for ${type}...`);

    const templateDir = `base/database/${type}`;
    await this.processor.processTemplate(templateDir, { database: this.provider }, projectPath);
  }
}
