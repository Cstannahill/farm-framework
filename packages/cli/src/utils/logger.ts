import chalk from "chalk";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type DebugLevel = "minimal" | "verbose" | "detailed" | "trace";

export interface LoggerOptions {
  level?: LogLevel;
  debugLevel?: DebugLevel;
  silent?: boolean;
  timestamp?: boolean;
}

class Logger {
  private level: LogLevel = "info";
  private debugLevel: DebugLevel = "minimal";
  private silent: boolean = false;
  private timestamp: boolean = false;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || this.getLogLevelFromEnv();
    this.debugLevel = options.debugLevel || this.getDebugLevelFromEnv();
    this.silent = options.silent || process.env.FARM_SILENT === "true";
    this.timestamp = options.timestamp || process.env.FARM_TIMESTAMP === "true";
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.FARM_LOG_LEVEL?.toLowerCase();
    if (envLevel && ["debug", "info", "warn", "error"].includes(envLevel)) {
      return envLevel as LogLevel;
    }
    return "info";
  }

  private getDebugLevelFromEnv(): DebugLevel {
    const envLevel = process.env.FARM_DEBUG_LEVEL?.toLowerCase();
    if (
      envLevel &&
      ["minimal", "verbose", "detailed", "trace"].includes(envLevel)
    ) {
      return envLevel as DebugLevel;
    }
    return "minimal";
  }
  private shouldLog(level: LogLevel): boolean {
    if (this.silent) return false;

    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.level];
  }

  private shouldLogDebug(debugLevel: DebugLevel): boolean {
    if (!this.shouldLog("debug")) return false;

    const debugLevels: Record<DebugLevel, number> = {
      minimal: 0,
      verbose: 1,
      detailed: 2,
      trace: 3,
    };

    return debugLevels[debugLevel] <= debugLevels[this.debugLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    let formatted = message;

    if (this.timestamp) {
      const timestamp = new Date().toISOString();
      formatted = `[${timestamp}] ${formatted}`;
    }

    switch (level) {
      case "debug":
        return chalk.gray(`🔍 ${formatted}`);
      case "info":
        return chalk.blue(`ℹ️  ${formatted}`);
      case "warn":
        return chalk.yellow(`⚠️  ${formatted}`);
      case "error":
        return chalk.red(`❌ ${formatted}`);
      default:
        return formatted;
    }
  }
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage("debug", message), ...args);
    }
  }

  // Granular debug logging methods
  debugMinimal(message: string, ...args: any[]): void {
    if (this.shouldLogDebug("minimal")) {
      console.log(this.formatMessage("debug", `[MINIMAL] ${message}`), ...args);
    }
  }

  debugVerbose(message: string, ...args: any[]): void {
    if (this.shouldLogDebug("verbose")) {
      console.log(this.formatMessage("debug", `[VERBOSE] ${message}`), ...args);
    }
  }

  debugDetailed(message: string, ...args: any[]): void {
    if (this.shouldLogDebug("detailed")) {
      console.log(
        this.formatMessage("debug", `[DETAILED] ${message}`),
        ...args
      );
    }
  }

  debugTrace(message: string, ...args: any[]): void {
    if (this.shouldLogDebug("trace")) {
      console.log(this.formatMessage("debug", `[TRACE] ${message}`), ...args);
    }
  }

  // Pipeline-specific logging methods
  step(message: string, ...args: any[]): void {
    if (this.shouldLog("info")) {
      console.log(chalk.cyan(`🔄 ${message}`), ...args);
    }
  }

  progress(message: string, ...args: any[]): void {
    if (this.shouldLog("info")) {
      console.log(chalk.gray(`   ${message}`), ...args);
    }
  }

  result(message: string, ...args: any[]): void {
    if (this.shouldLog("info")) {
      console.log(chalk.magenta(`📊 ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("info", message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message), ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.shouldLog("info")) {
      console.log(chalk.green(`✅ ${message}`), ...args);
    }
  }
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setDebugLevel(debugLevel: DebugLevel): void {
    this.debugLevel = debugLevel;
  }

  setSilent(silent: boolean): void {
    this.silent = silent;
  }
}

export const logger = new Logger();
