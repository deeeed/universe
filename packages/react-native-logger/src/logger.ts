// packages/react-native-logger/src/logger.tsx
import {
  clearLogs,
  enabled,
  getLogs,
  initializeDebugSettings,
  reset,
  getLogger,
  setLoggerConfig,
} from './logger.core';

// Call the initialization function on library load
initializeDebugSettings();

export { clearLogs, enabled, getLogs, reset, getLogger, setLoggerConfig };
