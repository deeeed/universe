import {
  addLog,
  clearLogs,
  disable,
  disableAll,
  enable,
  setLoggerConfig,
  enabled,
  getLogs,
} from './logger.core';
import type { LoggerMethods } from './logger.types';

const loggersMap = new Map<string, LoggerMethods>();

/**
 * Retrieves or creates a logger for a given namespace.
 * @param namespace - The namespace for the logger.
 * @returns The logger methods.
 */
export const getLogger = (namespace: string): LoggerMethods => {
  if (loggersMap.has(namespace)) {
    return loggersMap.get(namespace)!;
  }

  const logger: LoggerMethods = {
    log: (...params: unknown[]) => addLog({ namespace, level: 'log', params }),
    info: (...params: unknown[]) =>
      addLog({ namespace, level: 'info', params }),
    debug: (...params: unknown[]) =>
      addLog({ namespace, level: 'debug', params }),
    warn: (...params: unknown[]) =>
      addLog({ namespace, level: 'warn', params }),
    error: (...params: unknown[]) =>
      addLog({ namespace, level: 'error', params }),
  };

  loggersMap.set(namespace, logger);
  return logger;
};

export {
  getLogs,
  clearLogs,
  enable,
  disable,
  disableAll,
  enabled,
  setLoggerConfig,
};
