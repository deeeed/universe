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

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  success(message: string, ...args: unknown[]): void;
  warning(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  raw(message: string, ...args: unknown[]): void;
  newLine(): void;
  table(data: Record<string, unknown>[]): void;
  warn(message: string, ...args: unknown[]): void;
  isDebug(): boolean;
}
