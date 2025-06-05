// src/utils/styling.ts
import chalk from "chalk";

/**
 * Centralized styling utility for consistent CLI output
 * Uses a cohesive color scheme and formatting patterns
 */
export const styles = {
  // Brand colors
  brand: chalk.hex("#34D399"), // Green for FARM theme
  accent: chalk.hex("#3B82F6"), // Blue for secondary actions

  // Status colors
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  muted: chalk.gray,

  // Semantic styles
  title: chalk.bold.hex("#34D399"),
  subtitle: chalk.bold.white,
  emphasis: chalk.bold,
  command: chalk.cyan,
  path: chalk.magenta,
  url: chalk.underline.blue,
} as const;

/**
 * Icons with consistent colors (separated from styles for type safety)
 */
export const icons = {
  success: chalk.green("✅"),
  error: chalk.red("❌"),
  warning: chalk.yellow("⚠️"),
  info: chalk.blue("ℹ️"),
  debug: chalk.gray("🔍"),
  loading: chalk.blue("⏳"),
  rocket: chalk.yellow("🚀"),
  farm: chalk.green("🌾"),
  box: chalk.blue("📦"),
  folder: chalk.yellow("📁"),
  docker: chalk.blue("🐳"),
  book: chalk.cyan("📚"),
  gear: chalk.gray("⚙️"),
  checklist: chalk.blue("📋"),
} as const;

/**
 * Pre-built message formatters for common CLI scenarios
 */
export const messages = {
  welcome: (framework: string = "FARM Stack Framework") =>
    `${icons.farm} ${styles.title("Welcome to " + framework)}!\n`,

  creating: (type: string, name: string) =>
    `\n${icons.rocket} ${styles.subtitle(
      `Creating ${type} project: ${styles.emphasis(name)}`
    )}`,

  success: (message: string) =>
    `\n${icons.success} ${styles.success(message)}\n`,

  error: (message: string) => `\n${icons.error} ${styles.error(message)}`,

  warning: (message: string) => `${icons.warning} ${styles.warning(message)}`,

  info: (message: string) => `${icons.info} ${styles.info(message)}`,

  step: (message: string) => `${icons.gear} ${styles.muted(message)}`,

  nextSteps: () => `\n${icons.checklist} ${styles.subtitle("Next steps:")}`,

  commands: () =>
    `\n${icons.rocket} ${styles.subtitle("Development commands:")}`,

  resources: () => `\n${icons.book} ${styles.subtitle("Resources:")}`,

  happy: (framework: string = "FARM Stack Framework") =>
    `\n${icons.farm} ${styles.brand(`Happy coding with ${framework}!`)}`,
} as const;

/**
 * Helper functions for common formatting patterns
 */
export const format = {
  /**
   * Format a file path with consistent styling
   */
  path: (path: string) => styles.path(path),

  /**
   * Format a command with consistent styling
   */
  command: (cmd: string) => styles.command(cmd),

  /**
   * Format a URL with consistent styling
   */
  url: (url: string) => styles.url(url),

  /**
   * Format an error list
   */
  errorList: (errors: string[]) =>
    errors
      .map((error) => `  ${styles.muted("•")} ${styles.error(error)}`)
      .join("\n"),

  /**
   * Format a bulleted list
   */
  bulletList: (
    items: string[],
    colorName:
      | "brand"
      | "accent"
      | "success"
      | "error"
      | "warning"
      | "info"
      | "muted"
      | "title"
      | "subtitle"
      | "emphasis"
      | "command"
      | "path"
      | "url" = "muted"
  ) => {
    const colorFunc = styles[colorName];
    return items
      .map((item) => `  ${styles.muted("•")} ${colorFunc(item)}`)
      .join("\n");
  },

  /**
   * Format a numbered list
   */
  numberedList: (
    items: string[],
    colorName:
      | "brand"
      | "accent"
      | "success"
      | "error"
      | "warning"
      | "info"
      | "muted"
      | "title"
      | "subtitle"
      | "emphasis"
      | "command"
      | "path"
      | "url" = "muted"
  ) => {
    const colorFunc = styles[colorName];
    return items
      .map((item, i) => `  ${styles.muted(`${i + 1}.`)} ${colorFunc(item)}`)
      .join("\n");
  },

  /**
   * Format version information
   */
  versionInfo: (name: string, version: string) =>
    `${styles.emphasis(name)}: ${styles.info(version)}`,

  /**
   * Format platform information
   */
  platformInfo: (platform: string, arch: string) =>
    `${styles.emphasis("Platform")}: ${styles.info(`${platform} ${arch}`)}`,
} as const;

/**
 * Spinner utilities with consistent styling
 */
export const spinner = {
  frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],

  format: (frame: string, message: string) =>
    `${styles.accent(frame)} ${styles.muted(message)}`,
} as const;
