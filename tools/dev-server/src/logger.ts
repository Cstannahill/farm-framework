// tools/dev-server/src/logger.ts
import chalk from "chalk";

export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  service?: string;
  message: string;
  data?: any;
}

export class Logger {
  private logs: LogEntry[] = [];
  private logLevel: LogLevel;
  private verbose: boolean;

  constructor(logLevel: LogLevel = "info", verbose: boolean = false) {
    this.logLevel = logLevel;
    this.verbose = verbose;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error", "success"];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatTimestamp(): string {
    const now = new Date();
    return chalk.gray(now.toLocaleTimeString());
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    service?: string
  ): string {
    const timestamp = this.formatTimestamp();
    const levelFormatted = this.formatLevel(level);
    const serviceFormatted = service ? chalk.blue(`[${service}]`) : "";

    return `${timestamp} ${levelFormatted} ${serviceFormatted} ${message}`;
  }

  private formatLevel(level: LogLevel): string {
    switch (level) {
      case "debug":
        return chalk.gray("DEBUG");
      case "info":
        return chalk.cyan("INFO ");
      case "warn":
        return chalk.yellow("WARN ");
      case "error":
        return chalk.red("ERROR");
      case "success":
        return chalk.green("✓    ");
      default:
        // Ensure 'level' is treated as a string and provide a fallback
        return chalk.white(String(level).toUpperCase().padEnd(5));
    }
  }

  private log(
    level: LogLevel,
    message: string,
    service?: string,
    data?: any
  ): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      service,
      message,
      data,
    };

    this.logs.push(logEntry);

    const formattedMessage = this.formatMessage(level, message, service);
    console.log(formattedMessage);

    if (data && this.verbose) {
      console.log(chalk.gray("  Data:"), data);
    }
  }

  debug(message: string, data?: any): void {
    this.log("debug", message, undefined, data);
  }

  info(message: string, data?: any): void {
    this.log("info", message, undefined, data);
  }

  warn(message: string, data?: any): void {
    this.log("warn", message, undefined, data);
  }

  error(message: string, error?: any): void {
    this.log("error", message, undefined, error);
    if (error && this.verbose) {
      if (error.stack) {
        console.error(chalk.red(error.stack));
      } else if (error.message) {
        console.error(chalk.red(error.message));
      }
    }
  }

  success(message: string, data?: any): void {
    this.log("success", message, undefined, data);
  }

  // Service-specific logging methods
  service(serviceName: string, message: string, data?: any): void {
    this.log("info", message, serviceName, data);
  }

  serviceError(serviceName: string, message: string, error?: any): void {
    this.log("error", message, serviceName, error);
  }

  serviceWarn(serviceName: string, message: string, data?: any): void {
    this.log("warn", message, serviceName, data);
  }

  serviceSuccess(serviceName: string, message: string, data?: any): void {
    this.log("success", message, serviceName, data);
  }

  // Special formatting methods for development server
  startup(message: string): void {
    console.log(chalk.green.bold("🌾 FARM Dev Server"), chalk.white(message));
  }

  banner(lines: string[]): void {
    const maxLength = Math.max(...lines.map((line) => line.length));
    const border = "═".repeat(maxLength + 4);

    console.log(chalk.green(`╔${border}╗`));
    lines.forEach((line) => {
      const padding = " ".repeat(maxLength - line.length);
      console.log(chalk.green(`║  ${line}${padding}  ║`));
    });
    console.log(chalk.green(`╚${border}╝`));
  }

  section(title: string): void {
    console.log("\n" + chalk.bold.underline(title));
  }

  serviceStarting(serviceName: string): void {
    console.log(chalk.blue("🚀"), chalk.bold(`Starting ${serviceName}...`));
  }

  serviceReady(serviceName: string, url?: string): void {
    const urlPart = url ? chalk.cyan(` → ${url}`) : "";
    console.log(
      chalk.green("✅"),
      chalk.bold(`${serviceName} ready${urlPart}`)
    );
  }

  serviceFailed(serviceName: string, error: string): void {
    console.log(chalk.red("❌"), chalk.bold(`${serviceName} failed:`), error);
  }

  url(label: string, url: string): void {
    console.log(chalk.gray(`  ${label}:`), chalk.cyan.underline(url));
  }

  keyValue(key: string, value: string): void {
    console.log(chalk.gray(`  ${key}:`), chalk.white(value));
  }

  // Utility methods
  clear(): void {
    console.clear();
  }

  newLine(): void {
    console.log();
  }

  separator(): void {
    console.log(chalk.gray("─".repeat(60)));
  }

  getLogs(service?: string): LogEntry[] {
    if (service) {
      return this.logs.filter((log) => log.service === service);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  // Progress and status indicators
  working(message: string): () => void {
    const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let i = 0;

    const interval = setInterval(() => {
      process.stdout.write(
        `\r${chalk.cyan(spinner[i % spinner.length])} ${message}`
      );
      i++;
    }, 100);

    return () => {
      clearInterval(interval);
      process.stdout.write("\r" + " ".repeat(message.length + 2) + "\r");
    };
  }

  // Error formatting helpers
  formatError(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  // Development server specific messages
  configLoaded(configPath: string): void {
    this.success(`Configuration loaded from ${chalk.cyan(configPath)}`);
  }

  configError(configPath: string, error: any): void {
    this.error(
      `Failed to load configuration from ${chalk.cyan(configPath)}:`,
      error
    );
  }

  templateGenerated(templateName: string, outputPath: string): void {
    this.success(
      `Generated ${chalk.yellow(templateName)} template at ${chalk.cyan(
        outputPath
      )}`
    );
  }

  dependenciesInstalling(): void {
    this.info("Installing dependencies...");
  }

  dependenciesInstalled(): void {
    this.success("Dependencies installed successfully");
  }

  gitInitialized(): void {
    this.success("Git repository initialized");
  }

  // Health check messages
  healthCheckStarting(service: string, url: string): void {
    this.debug(`Health check starting for ${service} at ${url}`);
  }

  healthCheckPassed(service: string, responseTime: number): void {
    this.debug(`Health check passed for ${service} (${responseTime}ms)`);
  }

  healthCheckFailed(service: string, error: string): void {
    this.debug(`Health check failed for ${service}: ${error}`);
  }
}
