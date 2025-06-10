// packages/core/src/codegen/type-sync/orchestrator.ts
import { OpenAPIExtractor } from "./extractors/openapi";
import { TypeScriptGenerator } from "./generators/typescript";
import { APIClientGenerator } from "./generators/api-client";
import { ReactHookGenerator } from "./generators/react-hooks";
import { AIHookGenerator } from "./generators/ai-hooks";
import { GenerationCache } from "./cache";
import { TypeDiffer } from "./type-sync";
import fsExtra from "fs-extra";
import path from "path";
const fs = fsExtra;
const { ensureDir } = fsExtra;
/**
 * Coordinates extraction of OpenAPI schemas and generation of TypeScript
 * artifacts used by the framework.
 */
export class TypeSyncOrchestrator {
    extractor = new OpenAPIExtractor();
    cache = new GenerationCache(".farm/cache/types");
    differ = new TypeDiffer();
    generators = new Map();
    config = null;
    /**
     * Instantiate the orchestrator with default generators.
     */
    constructor() {
        this.initializeGenerators();
    }
    /**
     * Register built-in generator implementations.
     */
    initializeGenerators() {
        this.generators.set("types", new TypeScriptGenerator());
        this.generators.set("client", new APIClientGenerator());
        this.generators.set("hooks", new ReactHookGenerator());
        this.generators.set("ai-hooks", new AIHookGenerator());
    }
    /**
     * Prepare the orchestrator for operation.
     */
    async initialize(config) {
        this.config = config;
        await ensureDir(config.outputDir);
    }
    /**
     * Determine whether a generator should run based on current feature flags.
     */
    isFeatureEnabled(genType) {
        if (!this.config)
            return false;
        if (genType === "client")
            return this.config.features.client;
        if (genType === "hooks" || genType === "ai-hooks")
            return this.config.features.hooks;
        return true;
    }
    /**
     * Run a single synchronization cycle, generating any necessary artifacts.
     */
    async syncOnce(opts) {
        if (!this.config)
            throw new Error("Orchestrator not initialized");
        const config = { ...this.config, ...opts };
        const schema = await this.extractor
            .extractFromFastAPI(".", path.join(config.outputDir, "openapi.json"))
            .then(() => fs.readJson(path.join(config.outputDir, "openapi.json")));
        const schemaHash = this.cache.hashSchema(schema);
        const cached = await this.cache.get(schemaHash);
        if (cached && !this.differ.hasSchemaChanges(cached.schema, schema)) {
            return { filesGenerated: 0, fromCache: true };
        }
        const results = await this.generateArtifacts(schema, config.outputDir);
        await this.cache.set(schemaHash, { schema, results });
        return {
            filesGenerated: results.length,
            fromCache: false,
            artifacts: results.map((r) => r.path),
        };
    }
    /**
     * Generate all artifacts for the provided schema.
     */
    async generateArtifacts(schema, outputDir) {
        const results = [];
        const order = ["types", "client", "hooks", "ai-hooks"];
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
//# sourceMappingURL=orchestrator.js.map