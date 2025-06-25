// packages/react-native-logger/src/logger.state.ts
import type { LogEntry, LoggerConfig, LoggerMethods } from './logger.types';

export const DEFAULT_MAX_LOGS = 100;
export const DEFAULT_NAMESPACES = '';

export interface LoggerState {
  enabledNamespaces: string[];
  logsArray: LogEntry[];
  config: LoggerConfig;
  loggersMap: Map<string, LoggerMethods>;
  namespaceRegex: RegExp | null;
  initialized: boolean;
}

// Support for multiple isolated logger instances
const instanceStates = new Map<string, LoggerState>();

// Get or create state for a specific instance
export const getState = (instanceId: string = 'default'): LoggerState => {
  if (!instanceStates.has(instanceId)) {
    instanceStates.set(instanceId, {
      enabledNamespaces: [],
      logsArray: [],
      config: {
        maxLogs: DEFAULT_MAX_LOGS,
        namespaces: DEFAULT_NAMESPACES,
        disableExtraParamsInConsole: false,
      },
      loggersMap: new Map<string, LoggerMethods>(),
      namespaceRegex: null,
      initialized: false,
    });
  }
  return instanceStates.get(instanceId)!;
};

// For backward compatibility, maintain a default state
export const state: LoggerState = getState('default');
