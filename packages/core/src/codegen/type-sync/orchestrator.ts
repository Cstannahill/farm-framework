// packages/core/src/codegen/type-sync/orchestrator.ts
import { OpenAPIExtractor } from '../../../tools/codegen/openapi-extractor';
import { TypeScriptGenerator } from '../../../tools/codegen/typescript-generator';
import { APIClientGenerator } from '../../../tools/codegen/api-client-generator';
import { ReactHookGenerator } from '../../../tools/codegen/react-hook-generator';
import { AIHookGenerator } from '../../../tools/codegen/ai-hook-generator';
import { GenerationCache } from './cache';
import { TypeDiffer } from './differ';
import fs from 'fs-extra';
import path from 'path';
import type { OpenAPISchema } from '@farm/types';

export interface SyncOptions {
  apiUrl: string;
  outputDir: string;
  features: {
    client: boolean;
    hooks: boolean;
    streaming: boolean;
  };
}

export interface SyncResult {
  filesGenerated: number;
  fromCache: boolean;
  artifacts?: string[];
}

interface Generator {
  generate: (schema: OpenAPISchema, opts: any) => Promise<{ path: string }>; // minimal
}

export class TypeSyncOrchestrator {
  private extractor = new OpenAPIExtractor();
  private cache = new GenerationCache('.farm/cache/types');
  private differ = new TypeDiffer();
  private generators = new Map<string, Generator>();
  private config: SyncOptions | null = null;

  constructor() {
    this.initializeGenerators();
  }

  private initializeGenerators() {
    this.generators.set('types', new TypeScriptGenerator() as unknown as Generator);
    this.generators.set('client', new APIClientGenerator() as unknown as Generator);
    this.generators.set('hooks', new ReactHookGenerator() as unknown as Generator);
    this.generators.set('ai-hooks', new AIHookGenerator() as unknown as Generator);
  }

  async initialize(config: SyncOptions) {
    this.config = config;
    await fs.ensureDir(config.outputDir);
  }

  private isFeatureEnabled(genType: string): boolean {
    if (!this.config) return false;
    if (genType === 'client') return this.config.features.client;
    if (genType === 'hooks' || genType === 'ai-hooks') return this.config.features.hooks;
    return true;
  }

  async syncOnce(opts?: Partial<SyncOptions>): Promise<SyncResult> {
    if (!this.config) throw new Error('Orchestrator not initialized');
    const config = { ...this.config, ...opts } as SyncOptions;

    const schema = await this.extractor.extractFromFastAPI('.', path.join(config.outputDir, 'openapi.json'))
      .then(() => fs.readJson(path.join(config.outputDir, 'openapi.json')));

    const schemaHash = this.cache.hashSchema(schema);
    const cached = await this.cache.get(schemaHash);
    if (cached && !this.differ.hasSchemaChanges(cached.schema, schema)) {
      return { filesGenerated: 0, fromCache: true };
    }

    const results = await this.generateArtifacts(schema, config.outputDir);
    await this.cache.set(schemaHash, { schema, results });
    return { filesGenerated: results.length, fromCache: false, artifacts: results.map(r => r.path) };
  }

  private async generateArtifacts(schema: OpenAPISchema, outputDir: string) {
    const results: { path: string }[] = [];
    const order = ['types', 'client', 'hooks', 'ai-hooks'];
    for (const type of order) {
      const generator = this.generators.get(type);
      if (generator && this.isFeatureEnabled(type)) {
        const result = await generator.generate(schema, { outputDir });
        results.push(result);
      }
    }
    return results;
  }
}
