/* eslint-disable @typescript-eslint/no-unused-vars */
// packages/react-native-logger/src/logger.tsx
import {
  clearLogs,
  enabled,
  getLogs,
  initializeDebugSettings,
  reset,
  getLogger,
  setLoggerConfig,
  getLoggerConfig,
} from './logger.core';

// Call the initialization function on library load
initializeDebugSettings();

export {
  clearLogs,
  enabled,
  getLogs,
  reset,
  getLogger,
  setLoggerConfig,
  getLoggerConfig,
} from './logger.core';
