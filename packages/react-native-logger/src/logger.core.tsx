// packages/react-native-logger/src/logger.core.tsx
import type { AddLogParams, LogEntry, LoggerConfig } from './logger.types';
import { coerceToString } from './logger.utils';

let enabledNamespaces: string[] = [];
let logsArray: LogEntry[] = [];
let config: LoggerConfig = { maxLogs: 100, namespaces: '' }; // Default configuration

// Function to initialize debug settings from environment variables or local storage
const initializeDebugSettings = () => {
  let debugSetting = '';

  if (typeof process !== 'undefined' && process.env.DEBUG) {
    debugSetting = process.env.DEBUG;
    console.debug(`DEBUG setting from environment variable: ${debugSetting}`);
  } else if (typeof window !== 'undefined' && window.localStorage) {
    debugSetting = window.localStorage.getItem('DEBUG') || '';
    console.debug('DEBUG setting from local storage:', debugSetting);
  }

  if (debugSetting) {
    config.namespaces = debugSetting;
    setNamespaces(debugSetting);
  }
};

// Call the initialization function on library load
initializeDebugSettings();

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
  logsArray = [...logsArray, newLog];

  // Trim the logs array if it exceeds the maximum number of logs
  if (logsArray.length > config.maxLogs) {
    logsArray = logsArray.slice(-config.maxLogs);
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
  for (const name of enabledNamespaces) {
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
  enabledNamespaces = [];

  for (const ns of split) {
    if (!ns) continue;
    enabledNamespaces.push(ns);
  }
  console.log(`Enabled namespaces: ${enabledNamespaces.join(', ')}`);
};

/**
 * Retrieves all log entries.
 * @returns An array of log entries.
 */
export const getLogs = () => {
  return logsArray;
};

/**
 * Clears all log entries.
 */
export const clearLogs = () => {
  logsArray = [];
};

/**
 * Sets the logger configuration.
 * @param newConfig - The new configuration object.
 */
export const setLoggerConfig = (newConfig: Partial<LoggerConfig>) => {
  config = { ...config, ...newConfig };
  if (newConfig.namespaces !== undefined) {
    setNamespaces(newConfig.namespaces);
  }
};
