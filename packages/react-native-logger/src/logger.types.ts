export interface LoggerConfig {
  maxLogs: number;
  namespaces: string;
  disableExtraParamsInConsole?: boolean;
}

/**
 * Represents a log entry with a message, namespace, and timestamp.
 */
export interface LogEntry {
  message: string;
  namespace: string;
  timestamp: number;
}

/**
 * Parameters for adding a log entry.
 */
export interface AddLogParams {
  namespace: string;
  level: string;
  params?: unknown[];
}

/**
 * Methods available on a logger instance.
 */
export interface LoggerMethods {
  log: (...params: unknown[]) => void;
  info: (...params: unknown[]) => void;
  debug: (...params: unknown[]) => void;
  warn: (...params: unknown[]) => void;
  error: (...params: unknown[]) => void;
  extend: (subNamespace: string) => LoggerMethods;
}
