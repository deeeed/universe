import type { ReactNode } from 'react';
import React, { createContext, useCallback, useContext, useState } from 'react';

interface LogEntry {
  message: string;
  context: string;
  timestamp: Date;
}

interface AddLogParams {
  context: string;
  level: string;
  message: string;
  params?: unknown[];
}

interface LoggerMethods {
  log: (message: string, ...params: unknown[]) => void;
  info: (message: string, ...params: unknown[]) => void;
  debug: (message: string, ...params: unknown[]) => void;
  warn: (message: string, ...params: unknown[]) => void;
  error: (message: string, ...params: unknown[]) => void;
}

const LoggerActionsContext = createContext<
  | {
      getLogger: (context: string) => LoggerMethods;
      clearLogs: () => void;
    }
  | undefined
>(undefined);

const LoggerStateContext = createContext<
  | {
      logs: LogEntry[];
      refreshLogs: () => void;
    }
  | undefined
>(undefined);

const loggersMap = new Map<string, LoggerMethods>();
let logsArray: LogEntry[] = [];

const addLog = ({ context, level, message, params = [] }: AddLogParams) => {
  // Remove first '[' and last ']' from stringified params
  const sParams = JSON.stringify(params).replace(/^\[/, '').replace(/\]$/, '');

  const fullMessage = `[${level.toUpperCase()}] ${message} ${sParams ?? ''}`;
  const newLog: LogEntry = {
    message: fullMessage,
    context,
    timestamp: new Date(),
  };
  logsArray = [...logsArray, newLog];

  if (__DEV__) {
    const messageWithContext = `[${context}] ${message}`;
    switch (level) {
      case 'debug':
        console.debug(messageWithContext, ...params);
        break;
      case 'info':
        console.info(messageWithContext, ...params);
        break;
      case 'warn':
        console.warn(messageWithContext, ...params);
        break;
      case 'error':
        console.error(messageWithContext, ...params);
        break;
      default:
        console.log(messageWithContext, ...params);
        break;
    }
  }
};

export const getLogger = (context: string) => {
  if (loggersMap.has(context)) {
    return loggersMap.get(context)!;
  }

  const logger = {
    log: (message: string, ...params: unknown[]) =>
      addLog({ context, level: 'log', message, params }),
    info: (message: string, ...params: unknown[]) =>
      addLog({ context, level: 'info', message, params }),
    debug: (message: string, ...params: unknown[]) =>
      addLog({ context, level: 'debug', message, params }),
    warn: (message: string, ...params: unknown[]) =>
      addLog({ context, level: 'warn', message, params }),
    error: (message: string, ...params: unknown[]) =>
      addLog({ context, level: 'error', message, params }),
  };

  loggersMap.set(context, logger);
  return logger;
};

interface LoggerProviderProps {
  children: ReactNode;
}

export const LoggerProvider: React.FC<LoggerProviderProps> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>(logsArray);

  const refreshLogs = useCallback(() => {
    setLogs(logsArray);
  }, []);

  const clearLogs = () => {
    logsArray = [];
    refreshLogs(); // Trigger a re-render after clearing logs
  };

  return (
    <LoggerActionsContext.Provider value={{ getLogger, clearLogs }}>
      <LoggerStateContext.Provider value={{ logs, refreshLogs }}>
        {children}
      </LoggerStateContext.Provider>
    </LoggerActionsContext.Provider>
  );
};

export const useLogger = (
  context: string
): {
  logger: LoggerMethods;
  clearLogs: () => void;
} => {
  const loggerContext = useContext(LoggerActionsContext);
  if (!loggerContext) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }
  const logger = loggerContext.getLogger(context);
  return {
    logger,
    clearLogs: loggerContext.clearLogs,
  };
};

// @deprecated use useLogger instead
export const useLoggerActions = (
  context: string
): {
  logger: LoggerMethods;
  clearLogs: () => void;
} => {
  const loggerContext = useContext(LoggerActionsContext);
  console.warn(`useLoggerActions is deprecated, use useLogger instead`);

  if (!loggerContext) {
    throw new Error('useLoggerActions must be used within a LoggerProvider');
  }
  const logger = loggerContext.getLogger(context);
  return {
    logger,
    clearLogs: loggerContext.clearLogs,
  };
};

export const useLoggerState = (): {
  logs: LogEntry[];
  refreshLogs: () => void;
} => {
  const stateContext = useContext(LoggerStateContext);
  if (!stateContext) {
    throw new Error('useLoggerState must be used within a LoggerProvider');
  }
  return {
    logs: stateContext.logs,
    refreshLogs: stateContext.refreshLogs,
  };
};
