import chalk from "chalk";
import type { LogLevel, LoggerOptions } from "@farm-framework/types";

class Logger {
  private level: LogLevel = "info";
  private silent: boolean = false;
  private timestamp: boolean = false;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || this.getLogLevelFromEnv();
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
  private shouldLog(level: LogLevel): boolean {
    if (this.silent) return false;

    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      success: 1, // Same level as info
    };

    return levels[level] >= levels[this.level];
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

  setSilent(silent: boolean): void {
    this.silent = silent;
  }
}

export const logger = new Logger();
