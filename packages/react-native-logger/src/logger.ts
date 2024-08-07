// packages/react-native-logger/src/logger.tsx
import * as loggerCore from './logger.core';

// Call the initialization function on library load
loggerCore.initializeDebugSettings();

// Re-export everything from logger.core
export * from './logger.core';
