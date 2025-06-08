# FARM Framework Feature Implementation Plan

## Overview

Based on external feedback and analysis of high-impact features that would elevate FARM from a "solid starter" to an indispensable AI application framework, this document outlines a structured implementation plan. Features are organized by complexity and implementation time, allowing for quick wins while building toward more sophisticated capabilities.

## Implementation Phases

### Phase 1: Quick Wins (1-2 Weeks) - High-impact features that leverage existing infrastructure

### Phase 2: Core Enhancements (2-4 Weeks) - Features that significantly improve developer experience

### Phase 3: Advanced Capabilities (4-6 Weeks) - Sophisticated features that differentiate FARM in the market

**Phase 1**: Quick Wins (1-2 Weeks)
1.1 Real-Time Type Sync Enhancement
Timeline: 2-3 days
Impact: Critical - Eliminates type drift between Python and TypeScript
Current State Analysis
Looking at the existing structure:

Basic codegen infrastructure exists in tools/codegen/ with TypeScript generation capabilities
OpenAPI extraction implemented in tools/codegen/openapi-extractor.ts
Existing type generation in tools/codegen/typescript-generator.ts
CLI commands structure in packages/cli/src/commands/

Proposed Architecture Integration

    ```plaintext
    packages/
    ├── core/
    │   └── src/
    │       ├── codegen/
    │       │   ├── generator.ts          # Core generation orchestrator
    │       │   ├── type-sync/           # New: Real-time sync module
    │       │   │   ├── watcher.ts       # File watching integration
    │       │   │   ├── differ.ts        # Type diff detection
    │       │   │   └── cache.ts         # Generation cache
    │       │   └── index.ts
    │       └── index.ts
    ├── cli/
    │   └── src/
    │       └── commands/
    │           ├── generate.ts          # Existing generation command
    │           └── types/               # New: Type-specific commands
    │               ├── sync.ts          # Real-time sync command
    │               ├── check.ts         # CI validation command
    │               └── index.ts
    └── types/                           # Existing type definitions
    ```

## Implementation Details

### Enhanced Type Sync Command

    ```typescript
    // packages/cli/src/commands/types/sync.ts
    import { Command } from 'commander';
    import { TypeSyncOrchestrator } from '@farm/core/codegen/type-sync';
    import { ConfigLoader } from '@farm/core/config';
    import chalk from 'chalk';

    export class TypeSyncCommand {
    private orchestrator: TypeSyncOrchestrator;

    constructor() {
        this.orchestrator = new TypeSyncOrchestrator();
    }

    register(program: Command) {
        program
        .command('types:sync')
        .description('Synchronize TypeScript types from FastAPI models')
        .option('-w, --watch', 'Watch for changes and auto-regenerate')
        .option('--no-client', 'Skip API client generation')
        .option('--no-hooks', 'Skip React hooks generation')
        .option('--output <path>', 'Custom output directory', '.farm/types')
        .action(async (options) => {
            await this.execute(options);
        });
    }

    async execute(options: TypeSyncOptions) {
        try {
        // Load framework configuration
        const config = await ConfigLoader.load();

        // Initialize type sync with config
        await this.orchestrator.initialize({
            apiUrl: config.development?.apiUrl || 'http://localhost:8000',
            outputDir: options.output,
            features: {
            client: options.client !== false,
            hooks: options.hooks !== false,
            streaming: config.ai?.features?.streaming || false
            }
        });

        if (options.watch) {
            console.log(chalk.blue('🔄 Starting type sync in watch mode...'));
            await this.orchestrator.startWatchMode();
        } else {
            console.log(chalk.blue('🔄 Generating types...'));
            const result = await this.orchestrator.syncOnce();
            console.log(chalk.green(`✅ Generated ${result.filesGenerated} files`));
        }
        } catch (error) {
        console.error(chalk.red('❌ Type sync failed:'), error.message);
        process.exit(1);
        }
    }
    }

    ```

### Type Sync Orchestrator

    ```typescript

    // packages/core/src/codegen/type-sync/orchestrator.ts
    import { OpenAPIExtractor } from '../../../tools/codegen/openapi-extractor';
    import { TypeScriptGenerator } from '../../../tools/codegen/typescript-generator';
    import { ApiClientGenerator } from '../../../tools/codegen/api-client-generator';
    import { ReactHookGenerator } from '../../../tools/codegen/react-hook-generator';
    import { TypeDiffer } from './differ';
    import { GenerationCache } from './cache';

    export class TypeSyncOrchestrator {
    private extractor: OpenAPIExtractor;
    private generators: Map<string, Generator>;
    private cache: GenerationCache;
    private differ: TypeDiffer;

    constructor() {
        this.extractor = new OpenAPIExtractor();
        this.cache = new GenerationCache('.farm/cache/types');
        this.differ = new TypeDiffer();
        this.initializeGenerators();
    }

    private initializeGenerators() {
        this.generators = new Map([
        ['types', new TypeScriptGenerator()],
        ['client', new ApiClientGenerator()],
        ['hooks', new ReactHookGenerator()],
        ['ai-hooks', new AIHookGenerator()] // Special handling for AI streaming
        ]);
    }

    async syncOnce(): Promise<SyncResult> {
        // 1. Extract OpenAPI schema
        const schema = await this.extractor.extractFromRunningAPI();

        // 2. Check cache for changes
        const schemaHash = this.cache.hashSchema(schema);
        const cachedResult = await this.cache.get(schemaHash);

        if (cachedResult && !this.differ.hasChanges(cachedResult.schema, schema)) {
        return { filesGenerated: 0, fromCache: true };
        }

        // 3. Generate all artifacts
        const results = await this.generateArtifacts(schema);

        // 4. Write to filesystem with atomic operations
        await this.writeArtifacts(results);

        // 5. Update cache
        await this.cache.set(schemaHash, { schema, results });

        return {
        filesGenerated: results.length,
        fromCache: false,
        artifacts: results.map(r => r.path)
        };
    }

    private async generateArtifacts(schema: OpenAPISchema): Promise<GenerationResult[]> {
        const results: GenerationResult[] = [];

        // Generate in dependency order
        const generationOrder = ['types', 'client', 'hooks', 'ai-hooks'];

        for (const genType of generationOrder) {
        const generator = this.generators.get(genType);
        if (generator && this.isFeatureEnabled(genType)) {
            const result = await generator.generate(schema, {
            previousResults: results,
            outputDir: this.config.outputDir
            });
            results.push(result);
        }
        }

        return results;
    }
    }
    ```

### Integration with Development Server

    ```typescript
    // packages/core/src/watcher/type-sync-watcher.ts
    import { FileWatcher } from './file-watcher';
    import { TypeSyncOrchestrator } from '../codegen/type-sync/orchestrator';
    import { debounce } from 'lodash';

    export class TypeSyncWatcher {
    private watcher: FileWatcher;
    private orchestrator: TypeSyncOrchestrator;
    private syncInProgress = false;

    constructor(orchestrator: TypeSyncOrchestrator) {
        this.orchestrator = orchestrator;
        this.watcher = new FileWatcher();

        // Debounce to avoid rapid regeneration
        this.handleChange = debounce(this.handleChange.bind(this), 500);
    }

    async start() {
        // Watch Python model and route files
        this.watcher.watch([
        'apps/api/src/models/**/*.py',
        'apps/api/src/routes/**/*.py',
        'apps/api/src/schemas/**/*.py', // Pydantic schemas
        'apps/api/src/ai/models/**/*.py' // AI model definitions
        ], {
        ignored: ['**/__pycache__/**', '**/*.pyc'],
        events: ['add', 'change', 'unlink']
        });

        this.watcher.on('change', this.handleChange);

        console.log('👀 Watching for Python model changes...');
    }

    private async handleChange(path: string, event: string) {
        if (this.syncInProgress) return;

        console.log(`🔄 Detected ${event} in ${path}, regenerating types...`);

        try {
        this.syncInProgress = true;
        const startTime = Date.now();

        const result = await this.orchestrator.syncOnce();

        const duration = Date.now() - startTime;
        console.log(`✅ Types regenerated in ${duration}ms (${result.filesGenerated} files)`);

        // Notify frontend through WebSocket or file touch
        await this.notifyFrontend();
        } catch (error) {
        console.error('❌ Type regeneration failed:', error);
        } finally {
        this.syncInProgress = false;
        }
    }

    private async notifyFrontend() {
        // Touch a trigger file that Vite watches
        const triggerPath = '.farm/types/generated/.timestamp';
        await fs.writeFile(triggerPath, Date.now().toString());
    }
    }
    ```

## Enhanced Generation Pipeline

### Streaming-Aware Type Generation

    ```typescript

    // packages/core/src/codegen/generators/streaming-types.ts
    export class StreamingTypeGenerator {
    generateStreamingTypes(endpoint: OpenAPIPath): string {
        if (!endpoint['x-streaming']) return '';

        const streamingInterface = `
    export interface ${endpoint.operationId}StreamChunk {
    id: string;
    type: 'text' | 'function_call' | 'error' | 'done';
    content?: string;
    function_call?: {
        name: string;
        arguments: string;
    };
    error?: string;
    timestamp: number;
    }

    export interface ${endpoint.operationId}StreamOptions {
    onChunk?: (chunk: ${endpoint.operationId}StreamChunk) => void;
    onComplete?: (fullResponse: string) => void;
    onError?: (error: Error) => void;
    signal?: AbortSignal;
    }
    `;

        return streamingInterface;
    }
    }
    AI-Aware Hook Generation:
    typescript// tools/codegen/ai-hook-generator.ts (enhanced)
    export class AIHookGenerator extends ReactHookGenerator {
    protected generateHookBody(endpoint: OpenAPIPath): string {
        const isStreaming = endpoint['x-streaming'];
        const isAIEndpoint = endpoint.tags?.includes('ai');

        if (isStreaming && isAIEndpoint) {
        return this.generateStreamingAIHook(endpoint);
        }

        return super.generateHookBody(endpoint);
    }

    private generateStreamingAIHook(endpoint: OpenAPIPath): string {
        return `
    export function use${endpoint.operationId}(
    options?: ${endpoint.operationId}StreamOptions
    ) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(async (
        request: ${endpoint.operationId}Request
    ) => {
        setIsStreaming(true);
        setError(null);

        // Abort any existing request
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        try {
        const response = await apiClient.${endpoint.operationId}Stream(request, {
            signal: abortControllerRef.current.signal,
            onChunk: (chunk) => {
            if (chunk.type === 'text') {
                setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];

                if (lastMessage?.role === 'assistant') {
                    lastMessage.content += chunk.content || '';
                } else {
                    newMessages.push({
                    role: 'assistant',
                    content: chunk.content || ''
                    });
                }

                return newMessages;
                });
            }

            options?.onChunk?.(chunk);
            }
        });

        options?.onComplete?.(response);
        } catch (err) {
        const error = err as Error;
        setError(error);
        options?.onError?.(error);
        } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
        }
    }, [options]);

    const abort = useCallback(() => {
        abortControllerRef.current?.abort();
        setIsStreaming(false);
    }, []);

    return {
        messages,
        sendMessage,
        isStreaming,
        error,
        abort,
        clearMessages: () => setMessages([])
    };
    }
    `;
    }
    }
    ```

CI/CD Integration
Type Check Command for CI:

    ```typescript

    // packages/cli/src/commands/types/check.ts
    export class TypeCheckCommand {
    async execute() {
        console.log(chalk.blue('🔍 Checking type synchronization...'));

        // 1. Generate current types to temp directory
        const tempDir = '.farm/temp/type-check';
        const orchestrator = new TypeSyncOrchestrator();
        await orchestrator.syncOnce({ outputDir: tempDir });

        // 2. Compare with committed types

        const differ = new TypeDiffer();
        const differences = await differ.compareDirectories(
        '.farm/types/generated',
        tempDir
        );

        // 3. Report results
        if (differences.length > 0) {
        console.error(chalk.red('❌ Type definitions are out of sync!'));
        console.error('\nDifferences found:');
        differences.forEach(diff => {
            console.error(`  - ${diff.file}: ${diff.message}`);
        });
        console.error('\nRun "farm types sync" to update type definitions.');
        process.exit(1);
        }

        console.log(chalk.green('✅ Type definitions are in sync'));
    }
    }
    ```

Directory Structure Recommendations
Based on the current structure analysis, I recommend the following reorganization:

Consolidate Code Generation:

    ```plaintext

    packages/core/src/codegen/
    ├── index.ts                    # Main exports
    ├── orchestrator.ts             # Central coordination
    ├── extractors/
    │   ├── openapi.ts             # Move from tools/codegen
    │   └── graphql.ts             # Future: GraphQL support
    ├── generators/

    │   ├── typescript.ts          # Type generation
    │   ├── api-client.ts          # Client generation
    │   ├── react-hooks.ts         # Hook generation
    │   └── ai-hooks.ts           # AI-specific hooks
    ├── type-sync/
    │   ├── watcher.ts            # File watching
    │   ├── cache.ts              # Generation caching
    │   └── differ.ts             # Change detection
    └── utils/
        ├── schema-validator.ts    # OpenAPI validation
        └── ast-helpers.ts         # AST manipulation
        ```

Remove Duplicate Files:

Consolidate tools/codegen/\* into packages/core/src/codegen/
Move tools/cli/commands/generate.ts logic into packages/cli/src/commands/generate.ts

Output Structure:

    ```plaintext

    .farm/
    ├── types/
    │   ├── generated/              # All generated types
    │   │   ├── models/            # Data models
    │   │   ├── api/              # API client
    │   │   ├── hooks/            # React hooks
    │   │   └── index.ts          # Barrel exports
    │   └── custom/                # User-defined type extensions
    ├── cache/
    │   └── types/                 # Generation cache
    └── config/
        └── type-sync.json         # Type sync configuration

    ```

This structure provides clear separation of concerns while maintaining the ability to extend and customize the type generation pipeline as the framework evolves.
