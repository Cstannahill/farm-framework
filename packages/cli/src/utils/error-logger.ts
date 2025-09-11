// packages/cli/src/utils/error-logger.ts
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Error severity levels
 */
export enum ErrorSeverity {
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info',
    DEBUG = 'debug'
}

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
    HANDLEBARS = 'handlebars',
    TEMPLATE_PROCESSING = 'template_processing',
    FILE_OPERATIONS = 'file_operations',
    DEPENDENCY_RESOLUTION = 'dependency_resolution',
    CONTEXT_VALIDATION = 'context_validation',
    TEMPLATE_INHERITANCE = 'template_inheritance',
    GENERAL = 'general'
}

/**
 * Structured error entry
 */
export interface ErrorEntry {
    id: string;
    timestamp: string;
    severity: ErrorSeverity;
    category: ErrorCategory;
    message: string;
    details?: any;
    context?: {
        filePath?: string;
        templateName?: string;
        projectName?: string;
        operation?: string;
        [key: string]: any;
    };
    stack?: string;
    metadata?: {
        farmVersion?: string;
        nodeVersion?: string;
        platform?: string;
        [key: string]: any;
    };
}

/**
 * Error log session for tracking related errors
 */
export interface ErrorSession {
    sessionId: string;
    startTime: string;
    endTime?: string;
    projectName?: string;
    templateName?: string;
    operation: string;
    totalErrors: number;
    totalWarnings: number;
    errors: ErrorEntry[];
}

/**
 * Configuration for error logging
 */
export interface ErrorLoggerConfig {
    logDirectory: string;
    maxLogFiles: number;
    maxLogSize: number; // in bytes
    enableConsoleOutput: boolean;
    enableFileOutput: boolean;
    logLevel: ErrorSeverity;
}

/**
 * Comprehensive error logging system for FARM Framework
 */
export class ErrorLogger {
    private config: ErrorLoggerConfig;
    private currentSession: ErrorSession | null = null;
    private logFilePath: string;

    constructor(config?: Partial<ErrorLoggerConfig>) {
        this.config = {
            logDirectory: path.join(process.cwd(), '.farm-logs'),
            maxLogFiles: 10,
            maxLogSize: 10 * 1024 * 1024, // 10MB
            enableConsoleOutput: true,
            enableFileOutput: true,
            logLevel: ErrorSeverity.INFO,
            ...config
        };

        this.logFilePath = path.join(this.config.logDirectory, 'error-log.json');
        this.initializeLogDirectory();
    }

    /**
     * Initialize log directory and cleanup old logs
     */
    private async initializeLogDirectory(): Promise<void> {
        try {
            await fs.ensureDir(this.config.logDirectory);
            await this.cleanupOldLogs();
        } catch (error) {
            console.error('Failed to initialize error log directory:', error);
        }
    }

    /**
     * Start a new error logging session
     */
    public startSession(operation: string, context?: { projectName?: string; templateName?: string }): string {
        const sessionId = this.generateSessionId();
        this.currentSession = {
            sessionId,
            startTime: new Date().toISOString(),
            operation,
            projectName: context?.projectName,
            templateName: context?.templateName,
            totalErrors: 0,
            totalWarnings: 0,
            errors: []
        };

        this.log(ErrorSeverity.INFO, ErrorCategory.GENERAL, `Started session: ${operation}`, {
            sessionId,
            operation,
            ...context
        });

        return sessionId;
    }

    /**
     * End the current session
     */
    public endSession(): void {
        if (this.currentSession) {
            this.currentSession.endTime = new Date().toISOString();
            this.log(ErrorSeverity.INFO, ErrorCategory.GENERAL, `Ended session: ${this.currentSession.operation}`, {
                sessionId: this.currentSession.sessionId,
                totalErrors: this.currentSession.totalErrors,
                totalWarnings: this.currentSession.totalWarnings,
                duration: this.getSessionDuration()
            });
            this.writeSessionToFile();
            this.currentSession = null;
        }
    }

    /**
     * Log a Handlebars-specific error
     */
    public logHandlebarsError(
        error: Error | string,
        context: {
            filePath?: string;
            templateName?: string;
            templateContent?: string;
            handlebarsContext?: any;
            operation?: string;
        } = {}
    ): void {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const stack = typeof error === 'object' && error.stack ? error.stack : undefined;

        // Debug: Log to console to verify this is being called
        console.log(`🔍 [DEBUG] logHandlebarsError called: ${errorMessage}`);

        this.log(ErrorSeverity.ERROR, ErrorCategory.HANDLEBARS, `Handlebars Error: ${errorMessage}`, {
            ...context,
            stack,
            errorType: typeof error === 'object' ? error.constructor.name : 'string'
        });
    }

    /**
     * Log a template processing error
     */
    public logTemplateProcessingError(
        error: Error | string,
        context: {
            filePath?: string;
            templateName?: string;
            operation?: string;
            templateData?: any;
        } = {}
    ): void {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const stack = typeof error === 'object' && error.stack ? error.stack : undefined;

        // Debug: Log to console to verify this is being called
        console.log(`🔍 [DEBUG] logTemplateProcessingError called: ${errorMessage}`);

        this.log(ErrorSeverity.ERROR, ErrorCategory.TEMPLATE_PROCESSING, `Template Processing Error: ${errorMessage}`, {
            ...context,
            stack,
            errorType: typeof error === 'object' ? error.constructor.name : 'string'
        });
    }

    /**
     * Log a context validation error
     */
    public logContextValidationError(
        error: Error | string,
        context: {
            templateName?: string;
            projectName?: string;
            missingProperties?: string[];
            invalidProperties?: string[];
            contextData?: any;
        } = {}
    ): void {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const stack = typeof error === 'object' && error.stack ? error.stack : undefined;

        this.log(ErrorSeverity.ERROR, ErrorCategory.CONTEXT_VALIDATION, `Context Validation Error: ${errorMessage}`, {
            ...context,
            stack,
            errorType: typeof error === 'object' ? error.constructor.name : 'string'
        });
    }

    /**
     * Log a warning
     */
    public logWarning(
        message: string,
        category: ErrorCategory = ErrorCategory.GENERAL,
        context: any = {}
    ): void {
        this.log(ErrorSeverity.WARNING, category, message, context);
    }

    /**
     * Log an info message
     */
    public logInfo(
        message: string,
        category: ErrorCategory = ErrorCategory.GENERAL,
        context: any = {}
    ): void {
        this.log(ErrorSeverity.INFO, category, message, context);
    }

    /**
     * Core logging method
     */
    private log(
        severity: ErrorSeverity,
        category: ErrorCategory,
        message: string,
        details?: any
    ): void {
        // Check if we should log this level
        if (!this.shouldLog(severity)) {
            return;
        }

        const errorEntry: ErrorEntry = {
            id: this.generateErrorId(),
            timestamp: new Date().toISOString(),
            severity,
            category,
            message,
            details,
            context: this.extractContext(details),
            metadata: this.getMetadata()
        };

        // Add to current session
        if (this.currentSession) {
            this.currentSession.errors.push(errorEntry);
            if (severity === ErrorSeverity.ERROR) {
                this.currentSession.totalErrors++;
            } else if (severity === ErrorSeverity.WARNING) {
                this.currentSession.totalWarnings++;
            }
        }

        // Console output
        if (this.config.enableConsoleOutput) {
            this.logToConsole(errorEntry);
        }

        // File output
        if (this.config.enableFileOutput) {
            this.logToFile(errorEntry);
        }
    }

    /**
     * Check if we should log this severity level
     */
    private shouldLog(severity: ErrorSeverity): boolean {
        const levels = [ErrorSeverity.DEBUG, ErrorSeverity.INFO, ErrorSeverity.WARNING, ErrorSeverity.ERROR];
        const currentLevelIndex = levels.indexOf(this.config.logLevel);
        const messageLevelIndex = levels.indexOf(severity);
        return messageLevelIndex >= currentLevelIndex;
    }

    /**
     * Log to console with formatting
     */
    private logToConsole(entry: ErrorEntry): void {
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        const prefix = `[${timestamp}] [${entry.severity.toUpperCase()}] [${entry.category}]`;

        console.log(`${prefix} ${entry.message}`);

        if (entry.context?.filePath) {
            console.log(`  File: ${entry.context.filePath}`);
        }

        if (entry.details) {
            console.log(`  Details:`, entry.details);
        }

        if (entry.stack) {
            console.log(`  Stack:`, entry.stack);
        }
    }

    /**
     * Log to file
     */
    private async logToFile(entry: ErrorEntry): Promise<void> {
        try {
            const logLine = JSON.stringify(entry) + '\n';
            await fs.appendFile(this.logFilePath, logLine);
        } catch (error) {
            console.error('Failed to write to error log file:', error);
        }
    }

    /**
     * Write current session to file
     */
    private async writeSessionToFile(): Promise<void> {
        if (!this.currentSession) return;

        try {
            const sessionFilePath = path.join(
                this.config.logDirectory,
                `session-${this.currentSession.sessionId}.json`
            );
            await fs.writeJSON(sessionFilePath, this.currentSession, { spaces: 2 });
        } catch (error) {
            console.error('Failed to write session to file:', error);
        }
    }

    /**
     * Extract context from details
     */
    private extractContext(details?: any): any {
        if (!details) return undefined;

        const context: any = {};
        const contextKeys = ['filePath', 'templateName', 'projectName', 'operation'];

        for (const key of contextKeys) {
            if (details[key] !== undefined) {
                context[key] = details[key];
            }
        }

        return Object.keys(context).length > 0 ? context : undefined;
    }

    /**
     * Get system metadata
     */
    private getMetadata(): any {
        return {
            farmVersion: process.env.FARM_VERSION || 'unknown',
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            cwd: process.cwd()
        };
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique error ID
     */
    private generateErrorId(): string {
        return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get session duration
     */
    private getSessionDuration(): string | undefined {
        if (!this.currentSession) return undefined;

        const start = new Date(this.currentSession.startTime);
        const end = new Date(this.currentSession.endTime || new Date());
        const duration = end.getTime() - start.getTime();

        return `${duration}ms`;
    }

    /**
     * Cleanup old log files
     */
    private async cleanupOldLogs(): Promise<void> {
        try {
            const files = await fs.readdir(this.config.logDirectory);
            const logFiles = files
                .filter(file => file.startsWith('error-log') || file.startsWith('session-'))
                .map(async file => ({
                    name: file,
                    path: path.join(this.config.logDirectory, file),
                    stats: await fs.stat(path.join(this.config.logDirectory, file))
                }));

            // Sort by modification time (newest first)
            const sortedFiles = await Promise.all(logFiles);
            sortedFiles.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

            // Remove old files if we exceed maxLogFiles
            if (sortedFiles.length > this.config.maxLogFiles) {
                const filesToRemove = sortedFiles.slice(this.config.maxLogFiles);
                for (const file of filesToRemove) {
                    await fs.remove(file.path);
                }
            }

            // Check main log file size
            const mainLogPath = path.join(this.config.logDirectory, 'error-log.json');
            if (await fs.pathExists(mainLogPath)) {
                const stats = await fs.stat(mainLogPath);
                if (stats.size > this.config.maxLogSize) {
                    // Rotate log file
                    const rotatedPath = `${mainLogPath}.${Date.now()}`;
                    await fs.move(mainLogPath, rotatedPath);
                }
            }
        } catch (error) {
            console.error('Failed to cleanup old logs:', error);
        }
    }

    /**
     * Get the path to the error log file
     */
    public getLogFilePath(): string {
        return this.logFilePath;
    }

    /**
     * Get the path to the log directory
     */
    public getLogDirectory(): string {
        return this.config.logDirectory;
    }

    /**
     * Read and parse error log file
     */
    public async readErrorLog(): Promise<ErrorEntry[]> {
        try {
            if (!await fs.pathExists(this.logFilePath)) {
                return [];
            }

            const content = await fs.readFile(this.logFilePath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.trim());

            return lines.map(line => {
                try {
                    return JSON.parse(line) as ErrorEntry;
                } catch (error) {
                    console.error('Failed to parse error log line:', line, error);
                    return null;
                }
            }).filter(entry => entry !== null) as ErrorEntry[];
        } catch (error) {
            console.error('Failed to read error log:', error);
            return [];
        }
    }

    /**
     * Get summary of errors in current session
     */
    public getSessionSummary(): { errors: number; warnings: number; total: number } | null {
        if (!this.currentSession) return null;

        return {
            errors: this.currentSession.totalErrors,
            warnings: this.currentSession.totalWarnings,
            total: this.currentSession.errors.length
        };
    }
}

// Global error logger instance
export const errorLogger = new ErrorLogger({
    logDirectory: path.join(process.cwd(), 'template-logs'),
    enableConsoleOutput: false, // Disable console output - we only want file logging
    enableFileOutput: true,
    logLevel: ErrorSeverity.INFO
});

// Export convenience functions
export const logHandlebarsError = (error: Error | string, context?: any) =>
    errorLogger.logHandlebarsError(error, context);

export const logTemplateProcessingError = (error: Error | string, context?: any) =>
    errorLogger.logTemplateProcessingError(error, context);

export const logContextValidationError = (error: Error | string, context?: any) =>
    errorLogger.logContextValidationError(error, context);

export const logWarning = (message: string, category?: ErrorCategory, context?: any) =>
    errorLogger.logWarning(message, category, context);

export const logInfo = (message: string, category?: ErrorCategory, context?: any) =>
    errorLogger.logInfo(message, category, context);
