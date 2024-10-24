// packages/react-native-logger/src/logger.state.ts
import type { LogEntry, LoggerConfig, LoggerMethods } from './logger.types';

export const DEFAULT_MAX_LOGS = 100;
export const DEFAULT_NAMESPACES = '';

export interface LoggerState {
  enabledNamespaces: string[];
  logsArray: LogEntry[];
  config: LoggerConfig;
  loggersMap: Map<string, LoggerMethods>;
}

export const state: LoggerState = {
  enabledNamespaces: [],
  logsArray: [],
  config: {
    maxLogs: DEFAULT_MAX_LOGS,
    namespaces: DEFAULT_NAMESPACES,
    disableExtraParamsInConsole: false,
  },
  loggersMap: new Map<string, LoggerMethods>(),
};
