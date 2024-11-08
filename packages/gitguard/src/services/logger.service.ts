/* eslint-disable no-console */
import chalk from "chalk";
import { Logger, LogLevel, LoggerOptions } from "../types/logger.types.js";

export class LoggerService implements Logger {
  private readonly level: LogLevel;
  private readonly silent: boolean;

  constructor(options: LoggerOptions = {}) {
    this.silent = options.silent ?? this.getSilentFromEnv() ?? false;
    this.level = options.level ?? this.getLogLevelFromEnv() ?? LogLevel.INFO;

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

  public info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(message, ...args);
    }
  }

  public success(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(chalk.green("✓"), message, ...args);
    }
  }

  public warning(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.log(chalk.yellow("⚠"), message, ...args);
    }
  }

  public error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(chalk.red("✖"), message, ...args);
    }
  }

  public debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(chalk.gray("🐛"), message, ...args);
    }
  }

  public raw(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.log(message, ...args);
    }
  }

  public newLine(): void {
    if (!this.silent) {
      console.log();
    }
  }

  public table(data: Record<string, unknown>[]): void {
    if (!this.silent) {
      console.table(data);
    }
  }

  public warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(chalk.yellow("⚠"), message, ...args);
    }
  }

  public isDebug(): boolean {
    return this.level === LogLevel.DEBUG;
  }
}
