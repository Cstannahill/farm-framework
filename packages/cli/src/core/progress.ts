import ora, { Ora } from "ora";
import chalk from "chalk";
import { logger } from "../utils/logger.js";

export interface ProgressOptions {
  text?: string;
  color?: "blue" | "green" | "yellow" | "red" | "cyan" | "magenta";
  spinner?:
    | "dots"
    | "dots2"
    | "dots3"
    | "line"
    | "pipe"
    | "star"
    | "arrow"
    | "bouncingBar"
    | "bouncingBall";
  silent?: boolean;
}

export interface StepOptions extends ProgressOptions {
  successText?: string;
  errorText?: string;
}

export class ProgressIndicator {
  private spinner: Ora | null = null;
  private silent: boolean = false;

  constructor(options: ProgressOptions = {}) {
    this.silent = options.silent || process.env.FARM_SILENT === "true";
  }

  /**
   * Start a spinner with optional text
   */
  start(options: ProgressOptions = {}): void {
    if (this.silent) return;

    const { text = "Loading...", color = "blue", spinner = "dots" } = options;

    this.spinner = ora({
      text: chalk[color](text),
      spinner,
    }).start();
  }

  /**
   * Update spinner text
   */
  update(text: string, color: ProgressOptions["color"] = "blue"): void {
    if (this.silent || !this.spinner) return;

    this.spinner.text = chalk[color](text);
  }

  /**
   * Mark spinner as successful and stop
   */
  succeed(text?: string): void {
    if (this.silent || !this.spinner) return;

    this.spinner.succeed(text ? chalk.green(text) : undefined);
    this.spinner = null;
  }

  /**
   * Mark spinner as failed and stop
   */
  fail(text?: string): void {
    if (this.silent || !this.spinner) return;

    this.spinner.fail(text ? chalk.red(text) : undefined);
    this.spinner = null;
  }

  /**
   * Mark spinner as warning and stop
   */
  warn(text?: string): void {
    if (this.silent || !this.spinner) return;

    this.spinner.warn(text ? chalk.yellow(text) : undefined);
    this.spinner = null;
  }

  /**
   * Stop spinner with info symbol
   */
  info(text?: string): void {
    if (this.silent || !this.spinner) return;

    this.spinner.info(text ? chalk.blue(text) : undefined);
    this.spinner = null;
  }

  /**
   * Stop spinner without any symbol
   */
  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Execute a step with progress indication
   */
  async step<T>(
    fn: () => Promise<T> | T,
    options: StepOptions = {}
  ): Promise<T> {
    const {
      text = "Processing...",
      successText,
      errorText,
      color = "blue",
    } = options;

    if (!this.silent) {
      this.start({ text, color });
    }

    try {
      const result = await fn();

      if (!this.silent) {
        this.succeed(successText || text.replace(/\.\.\.$/, " ✓"));
      }

      return result;
    } catch (error) {
      if (!this.silent) {
        this.fail(errorText || `${text.replace(/\.\.\.$/, "")} failed`);
      }
      throw error;
    }
  }
}

/**
 * Progress bar for longer operations
 */
export class ProgressBar {
  private total: number;
  private current: number = 0;
  private width: number = 40;
  private silent: boolean = false;

  constructor(
    total: number,
    options: { width?: number; silent?: boolean } = {}
  ) {
    this.total = total;
    this.width = options.width || 40;
    this.silent = options.silent || process.env.FARM_SILENT === "true";
  }

  /**
   * Update progress
   */
  update(current: number, text?: string): void {
    if (this.silent) return;

    this.current = Math.min(current, this.total);
    const percentage = Math.round((this.current / this.total) * 100);
    const filled = Math.round((this.current / this.total) * this.width);
    const empty = this.width - filled;

    const bar = `[${"█".repeat(filled)}${" ".repeat(empty)}]`;
    const line = `${bar} ${percentage}% ${text || ""}`;

    // Clear line and write new progress
    process.stdout.write(`\r${line}`);

    if (this.current === this.total) {
      process.stdout.write("\n");
    }
  }

  /**
   * Increment progress by 1
   */
  increment(text?: string): void {
    this.update(this.current + 1, text);
  }

  /**
   * Complete the progress bar
   */
  complete(text?: string): void {
    this.update(this.total, text);
  }
}

/**
 * Multi-step progress indicator
 */
export class MultiStepProgress {
  private steps: string[];
  private currentStep: number = -1;
  private stepIndicators: ProgressIndicator[] = [];
  private silent: boolean = false;

  constructor(steps: string[], options: { silent?: boolean } = {}) {
    this.steps = steps;
    this.silent = options.silent || process.env.FARM_SILENT === "true";
  }

  /**
   * Start next step
   */
  nextStep(text?: string): ProgressIndicator {
    // Complete previous step
    if (this.currentStep >= 0) {
      this.stepIndicators[this.currentStep]?.succeed();
    }

    this.currentStep++;
    const stepText = text || this.steps[this.currentStep];
    const stepNumber = this.currentStep + 1;
    const totalSteps = this.steps.length;

    if (!this.silent) {
      console.log(chalk.blue(`\n[${stepNumber}/${totalSteps}] ${stepText}`));
    }

    const indicator = new ProgressIndicator({ silent: this.silent });
    this.stepIndicators[this.currentStep] = indicator;

    return indicator;
  }

  /**
   * Complete all steps
   */
  complete(): void {
    if (this.currentStep >= 0) {
      this.stepIndicators[this.currentStep]?.succeed();
    }

    if (!this.silent) {
      console.log(chalk.green("\n✅ All steps completed successfully!"));
    }
  }

  /**
   * Fail current step
   */
  fail(error?: string): void {
    if (this.currentStep >= 0) {
      this.stepIndicators[this.currentStep]?.fail(error);
    }
  }
}

// Convenience functions
export function createSpinner(options?: ProgressOptions): ProgressIndicator {
  return new ProgressIndicator(options);
}

export function createProgressBar(
  total: number,
  options?: { width?: number; silent?: boolean }
): ProgressBar {
  return new ProgressBar(total, options);
}

export function createMultiStep(
  steps: string[],
  options?: { silent?: boolean }
): MultiStepProgress {
  return new MultiStepProgress(steps, options);
}
