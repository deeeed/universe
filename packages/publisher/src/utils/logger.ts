/* eslint-disable no-console */
import chalk from "chalk";

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LoggerOptions {
  level?: LogLevel;
  silent?: boolean;
  debug?: boolean;
}

export class Logger {
  private level: LogLevel;
  private silent: boolean;

  constructor(options: LoggerOptions = {}) {
    // Constructor options take precedence over environment variables
    this.silent = options.silent ?? this.getSilentFromEnv() ?? false;
    this.level = options.level ?? this.getLogLevelFromEnv() ?? LogLevel.INFO;

    // Special case for debug flag - can be enabled via options or env
    if (options.debug || process.env.DEBUG) {
      this.level = LogLevel.DEBUG;
    }
  }

  private getLogLevelFromEnv(): LogLevel | undefined {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    if (level && level in LogLevel) {
      return LogLevel[level as keyof typeof LogLevel];
    }
    return undefined;
  }

  private getSilentFromEnv(): boolean | undefined {
    const silent = process.env.LOG_SILENT;
    if (silent !== undefined) {
      return silent === "true";
    }
    return undefined;
  }

  private shouldLog(level: LogLevel): boolean {
    return !this.silent && level <= this.level;
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(chalk.blue("ℹ"), message, ...args);
    }
  }

  success(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(chalk.green("✔"), message, ...args);
    }
  }

  warning(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.log(chalk.yellow("⚠"), message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(chalk.red("✖"), message, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(chalk.gray("🐛"), message, ...args);
    }
  }

  raw(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.log(message, ...args);
    }
  }

  newLine(): void {
    console.log();
  }

  table(data: Record<string, unknown>[]): void {
    if (!this.silent) {
      console.table(data);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(chalk.yellow("⚠"), message, ...args);
    }
  }
}
