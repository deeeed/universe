// packages/react-native-logger/src/logger.tsx
import {
  addLog,
  clearLogs,
  enabled,
  getLogs,
  reset,
  setLoggerConfig,
} from './logger.core';
import { initializeDebugSettings } from './logger.init';
import { state } from './logger.state';
import type { LoggerMethods } from './logger.types';

/**
 * Retrieves or creates a logger for a given namespace.
 * @param namespace - The namespace for the logger.
 * @returns The logger methods.
 */
export const getLogger = (namespace: string): LoggerMethods => {
  if (state.loggersMap.has(namespace)) {
    return state.loggersMap.get(namespace)!;
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
    extend: (subNamespace: string) => {
      const extendedNamespace = `${namespace}:${subNamespace}`;
      return getLogger(extendedNamespace);
    },
  };

  state.loggersMap.set(namespace, logger);
  return logger;
};

// Call the initialization function on library load
initializeDebugSettings();

export { clearLogs, enabled, getLogs, reset, setLoggerConfig };
