// packages/react-native-logger/src/logger.core.tsx
import { DEFAULT_MAX_LOGS, DEFAULT_NAMESPACES, getState } from './logger.state';
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
 * @param instanceId - Optional instance ID for isolated logging.
 */
export const addLog = (
  { namespace, level, params = [] }: AddLogParams,
  instanceId?: string
) => {
  const currentState = getState(instanceId);
  if (!enabled(namespace, instanceId)) {
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
  currentState.logsArray = [...currentState.logsArray, newLog];

  // Trim the logs array if it exceeds the maximum number of logs
  if (currentState.logsArray.length > currentState.config.maxLogs) {
    currentState.logsArray = currentState.logsArray.slice(
      -currentState.config.maxLogs
    );
  }

  const toLogParams = hasStringMessage ? restParams : params;
  const consoleParams = currentState.config.disableExtraParamsInConsole
    ? []
    : toLogParams;

  // Apply colorization in dev mode
  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
  const isTerminal = typeof process !== 'undefined' && process.stdout?.isTTY;
  const isBrowser = typeof window !== 'undefined' && typeof window.console !== 'undefined';
  
  // Calculate color based on namespace hash
  const hash = namespace
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Get the appropriate console method
  const consoleMethod = level === 'debug' ? console.debug :
                       level === 'info' ? console.info :
                       level === 'warn' ? console.warn :
                       level === 'error' ? console.error :
                       console.log;

  if (isDev && isBrowser && !isTerminal) {
    // Browser console with CSS styling
    const colors = ['#e74c3c', '#27ae60', '#f39c12', '#3498db', '#9b59b6', '#1abc9c', '#95a5a6', '#34495e'];
    const colorIndex = hash % colors.length;
    consoleMethod(`%c${messageWithNamespace}`, `color: ${colors[colorIndex]}; font-weight: bold;`, ...consoleParams);
  } else if (isDev && isTerminal) {
    // Terminal with ANSI colors
    const colors = ['\x1b[31m', '\x1b[32m', '\x1b[33m', '\x1b[34m', '\x1b[35m', '\x1b[36m', '\x1b[37m', '\x1b[90m'];
    const colorIndex = hash % colors.length;
    const coloredMessage = `${colors[colorIndex]}${messageWithNamespace}\x1b[0m`;
    consoleMethod(coloredMessage, ...consoleParams);
  } else {
    // No colorization (production or unsupported environment)
    consoleMethod(messageWithNamespace, ...consoleParams);
  }
};

/**
 * Checks if logging is enabled for a namespace.
 * @param namespace - The namespace to check.
 * @param instanceId - Optional instance ID for isolated logging.
 * @returns True if logging is enabled, false otherwise.
 */
export const enabled = (namespace: string, instanceId?: string) => {
  const currentState = getState(instanceId);

  // Lazy initialization on first use
  if (!currentState.initialized) {
    initializeDebugSettings(instanceId);
  }

  // Use pre-compiled regex for performance
  if (currentState.namespaceRegex) {
    return currentState.namespaceRegex.test(namespace);
  }

  return false;
};

/**
 * Sets logging for specified namespaces.
 * @param namespaces - The namespaces to set.
 * @param instanceId - Optional instance ID for isolated logging.
 */
export const setNamespaces = (namespaces: string, instanceId?: string) => {
  const currentState = getState(instanceId);
  const split = namespaces.split(/[\s,]+/);
  currentState.enabledNamespaces = [];

  const patterns: string[] = [];
  for (const ns of split) {
    if (!ns) continue;
    currentState.enabledNamespaces.push(ns);
    // Convert wildcard patterns to regex
    const pattern = ns
      .replace(/[-[\]/{}()+?.\\^$|]/g, '\\$&') // Escape special regex chars
      .replace(/\*/g, '.*'); // Convert * to .*
    // For non-wildcard patterns that don't end with *, also match subnamespaces
    if (!ns.endsWith('*')) {
      patterns.push(`^${pattern}$|^${pattern}:.*$`);
    } else {
      patterns.push(`^${pattern}$`);
    }
  }

  // Compile regex for performance
  if (patterns.length > 0) {
    currentState.namespaceRegex = new RegExp(patterns.join('|'));
  } else {
    currentState.namespaceRegex = null;
  }
};

/**
 * Retrieves all log entries.
 * @param instanceId - Optional instance ID for isolated logging.
 * @returns An array of log entries.
 */
export const getLogs = (instanceId?: string) => {
  const currentState = getState(instanceId);
  return currentState.logsArray;
};

/**
 * Clears all log entries.
 * @param instanceId - Optional instance ID for isolated logging.
 */
export const clearLogs = (instanceId?: string) => {
  const currentState = getState(instanceId);
  currentState.logsArray = [];
};

/**
 * Resets the logger to its default state and loads debug settings from environment variables or local storage.
 * @param instanceId - Optional instance ID for isolated logging.
 */
export const reset = (instanceId?: string) => {
  const currentState = getState(instanceId);
  clearLogs(instanceId);
  currentState.loggersMap.clear();
  currentState.enabledNamespaces = [];
  currentState.namespaceRegex = null;
  currentState.initialized = false;
  currentState.config = {
    maxLogs: DEFAULT_MAX_LOGS,
    namespaces: DEFAULT_NAMESPACES,
    disableExtraParamsInConsole: false,
  };
  initializeDebugSettings(instanceId);
};

/**
 * Sets the logger configuration.
 * @param newConfig - The new configuration object.
 * @param instanceId - Optional instance ID for isolated logging.
 */
export const setLoggerConfig = (
  newConfig: Partial<LoggerConfig>,
  instanceId?: string
) => {
  const currentState = getState(instanceId);
  currentState.config = { ...currentState.config, ...newConfig };
  if (newConfig.namespaces !== undefined) {
    setNamespaces(newConfig.namespaces, instanceId);
  }
  if (newConfig.disableExtraParamsInConsole !== undefined) {
    currentState.config.disableExtraParamsInConsole =
      newConfig.disableExtraParamsInConsole;
  }
};

/**
 * Retrieves the current logger configuration.
 * @param instanceId - Optional instance ID for isolated logging.
 * @returns The logger configuration object.
 */
export const getLoggerConfig = (instanceId?: string) => {
  const currentState = getState(instanceId);
  return currentState.config;
};

/**
 * Retrieves or creates a logger for a given namespace.
 * @param namespace - The namespace for the logger.
 * @param instanceId - Optional instance ID for isolated logging.
 * @returns The logger methods.
 */
export const getLogger = (
  namespace: string,
  instanceId?: string
): LoggerMethods => {
  const currentState = getState(instanceId);

  // Lazy initialization on first use
  if (!currentState.initialized) {
    initializeDebugSettings(instanceId);
  }

  const cacheKey = instanceId ? `${instanceId}:${namespace}` : namespace;

  if (currentState.loggersMap.has(cacheKey)) {
    return currentState.loggersMap.get(cacheKey)!;
  }

  const logger: LoggerMethods = {
    log: (...params: unknown[]) =>
      addLog({ namespace, level: 'log', params }, instanceId),
    info: (...params: unknown[]) =>
      addLog({ namespace, level: 'info', params }, instanceId),
    debug: (...params: unknown[]) =>
      addLog({ namespace, level: 'debug', params }, instanceId),
    warn: (...params: unknown[]) =>
      addLog({ namespace, level: 'warn', params }, instanceId),
    error: (...params: unknown[]) =>
      addLog({ namespace, level: 'error', params }, instanceId),
    extend: (subNamespace: string) => {
      const extendedNamespace = `${namespace}:${subNamespace}`;
      return getLogger(extendedNamespace, instanceId);
    },
  };

  currentState.loggersMap.set(cacheKey, logger);
  return logger;
};

// Function to initialize debug settings from environment variables or local storage
export const initializeDebugSettings = (instanceId?: string) => {
  const currentState = getState(instanceId);

  // Mark as initialized to prevent multiple initializations
  currentState.initialized = true;

  let debugSetting = '';

  if (typeof process !== 'undefined' && process.env.DEBUG) {
    debugSetting = process.env.DEBUG;
  } else if (typeof window !== 'undefined' && window.localStorage) {
    try {
      debugSetting = window.localStorage.getItem('DEBUG') || '';
    } catch (e) {
      // localStorage might not be available in some environments
    }
  }

  if (debugSetting) {
    currentState.config.namespaces = debugSetting;
    setNamespaces(debugSetting, instanceId);
  }
};
