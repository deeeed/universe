// packages/react-native-logger/src/logger.core.tsx
import { DEFAULT_MAX_LOGS, DEFAULT_NAMESPACES, state } from './logger.state';
import type {
  AddLogParams,
  LogEntry,
  LoggerConfig,
  LoggerMethods,
} from './logger.types';
import { coerceToString } from './logger.utils';

/**
 * Adds a log entry.
 * @param params - Parameters for the log entry.
 */
export const addLog = ({ namespace, level, params = [] }: AddLogParams) => {
  if (!enabled(namespace)) {
    return;
  }

  const [message, ...restParams] = params;

  let messageWithNamespace = `[${namespace}] `;
  let hasStringMessage = false;
  if (typeof message === 'string') {
    messageWithNamespace = `[${namespace}] ${message}`;
    hasStringMessage = true;
  } else if (message instanceof Error) {
    messageWithNamespace = `[${namespace}] ${message.stack ?? message.message}`;
    hasStringMessage = true;
  }

  const sParams = coerceToString(hasStringMessage ? restParams : params);

  const fullMessage = `[${level.toUpperCase()}] ${messageWithNamespace} ${sParams}`;
  const newLog: LogEntry = {
    message: fullMessage,
    namespace: namespace,
    timestamp: Date.now(),
  };
  state.logsArray = [...state.logsArray, newLog];

  // Trim the logs array if it exceeds the maximum number of logs
  if (state.logsArray.length > state.config.maxLogs) {
    state.logsArray = state.logsArray.slice(-state.config.maxLogs);
  }

  const toLogParams = hasStringMessage ? restParams : params;
  switch (level) {
    case 'debug':
      console.debug(messageWithNamespace, ...toLogParams);
      break;
    case 'info':
      console.info(messageWithNamespace, ...toLogParams);
      break;
    case 'warn':
      console.warn(messageWithNamespace, ...toLogParams);
      break;
    case 'error':
      console.error(messageWithNamespace, ...toLogParams);
      break;
    default:
      console.log(messageWithNamespace, ...toLogParams);
      break;
  }
};

/**
 * Checks if logging is enabled for a namespace.
 * @param namespace - The namespace to check.
 * @returns True if logging is enabled, false otherwise.
 */
export const enabled = (namespace: string) => {
  for (const name of state.enabledNamespaces) {
    if (namespace === name || namespace.startsWith(name.replace('*', ''))) {
      return true;
    }
  }
  return false;
};

/**
 * Sets logging for specified namespaces.
 * @param namespaces - The namespaces to set.
 */
export const setNamespaces = (namespaces: string) => {
  const split = namespaces.split(/[\s,]+/);
  state.enabledNamespaces = [];

  for (const ns of split) {
    if (!ns) continue;
    state.enabledNamespaces.push(ns);
  }
};

/**
 * Retrieves all log entries.
 * @returns An array of log entries.
 */
export const getLogs = () => {
  return state.logsArray;
};

/**
 * Clears all log entries.
 */
export const clearLogs = () => {
  state.logsArray = [];
};

/**
 * Resets the logger to its default state and loads debug settings from environment variables or local storage.
 */
export const reset = () => {
  clearLogs();
  setLoggerConfig({
    maxLogs: DEFAULT_MAX_LOGS,
    namespaces: DEFAULT_NAMESPACES,
  });
  initializeDebugSettings();
};

/**
 * Sets the logger configuration.
 * @param newConfig - The new configuration object.
 */
export const setLoggerConfig = (newConfig: Partial<LoggerConfig>) => {
  state.config = { ...state.config, ...newConfig };
  if (newConfig.namespaces !== undefined) {
    setNamespaces(newConfig.namespaces);
  }
};

/**
 * Retrieves the current logger configuration.
 * @returns The logger configuration object.
 */
export const getLoggerConfig = () => {
  return state.config;
};

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

// Function to initialize debug settings from environment variables or local storage
export const initializeDebugSettings = () => {
  let debugSetting = '';

  if (typeof process !== 'undefined' && process.env.DEBUG) {
    debugSetting = process.env.DEBUG;
  } else if (typeof window !== 'undefined' && window.localStorage) {
    debugSetting = window.localStorage.getItem('DEBUG') || '';
  }

  if (debugSetting) {
    state.config.namespaces = debugSetting;
    setNamespaces(debugSetting);
  }
};
