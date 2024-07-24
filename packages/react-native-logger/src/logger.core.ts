// packages/react-native-logger/src/logger.core.tsx
import { initializeDebugSettings } from './logger.init';
import { DEFAULT_MAX_LOGS, DEFAULT_NAMESPACES, state } from './logger.state';
import type { AddLogParams, LogEntry, LoggerConfig } from './logger.types';
import { coerceToString } from './logger.utils';

/**
 * Adds a log entry.
 * @param params - Parameters for the log entry.
 */
export const addLog = ({ namespace, level, params = [] }: AddLogParams) => {
  if (!enabled(namespace)) {
    console.debug(`DISABLED: ${namespace}`);
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
  console.log(
    `setNamespaces: ${namespaces} Enabled namespaces: ${state.enabledNamespaces.join(
      ', '
    )}`
  );
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
