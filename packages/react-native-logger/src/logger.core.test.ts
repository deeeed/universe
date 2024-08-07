// packages/react-native-logger/src/logger.core.test.ts
import {
  addLog,
  clearLogs,
  enabled,
  getLogger,
  getLoggerConfig,
  getLogs,
  initializeDebugSettings,
  reset,
  setLoggerConfig,
  setNamespaces,
} from './logger.core';

export const mockGetItem = jest.fn();
export const mockSetItem = jest.fn();
export const mockRemoveItem = jest.fn();

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    clear: jest.fn(),
  },
  writable: true,
});

export const mockProcessEnv = (key: string, value: string) => {
  process.env[key] = value;
};

// Utility functions for initializing and resetting the logger
const initializeLogger = () => {
  clearLogs();
  setLoggerConfig({ namespaces: '' });
};

const resetLoggerAndMocks = () => {
  reset();
  mockGetItem.mockClear();
};

// Higher-level describe block for all logger tests
describe('Logger Tests', () => {
  describe('Logger Module', () => {
    beforeEach(initializeLogger);

    it('should add a log entry', () => {
      setLoggerConfig({ namespaces: 'test' });
      addLog({ namespace: 'test', level: 'info', params: ['Test log entry'] });
      const logs = getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0]?.message).toContain('Test log entry');
    });

    it('should enable and disable namespaces', () => {
      setLoggerConfig({ namespaces: 'test' });
      expect(enabled('test')).toBe(true);
      setLoggerConfig({ namespaces: '' });
      expect(enabled('test')).toBe(false);
    });

    it('should enable and disable wildcard namespaces', () => {
      setLoggerConfig({ namespaces: 'ns1:*' });
      expect(enabled('ns1:file')).toBe(true);
      expect(enabled('ns2:file')).toBe(false);
      expect(enabled('ns1:subnamespace:file')).toBe(true);

      setLoggerConfig({ namespaces: '' });
      expect(enabled('ns1:file')).toBe(false);
      expect(enabled('ns1:subnamespace:file')).toBe(false);
    });

    it('should enable multiple namespaces and disable specific ones', () => {
      setLoggerConfig({ namespaces: 'ns1:*,ns2:subnamespace' });
      expect(enabled('ns1:file')).toBe(true);
      expect(enabled('ns2:file')).toBe(false);
      expect(enabled('ns2:subnamespace')).toBe(true);
      expect(enabled('ns2:subnamespace:file')).toBe(true);

      setLoggerConfig({ namespaces: '' });
      expect(enabled('ns1:file')).toBe(false);
      expect(enabled('ns2:subnamespace:file')).toBe(false);

      setLoggerConfig({ namespaces: 'ns3:file' });
      expect(enabled('ns3:file')).toBe(true);
      expect(enabled('ns2:subnamespace:file')).toBe(false);
    });

    it('should not exceed max log limit', () => {
      setLoggerConfig({ namespaces: 'test', maxLogs: 10 });
      for (let i = 0; i < 15; i++) {
        addLog({
          namespace: 'test',
          level: 'info',
          params: [`Log entry ${i}`],
        });
      }
      const logs = getLogs();
      expect(logs.length).toBe(10);
      expect(logs[0]?.message).toContain('Log entry 5'); // Ensure the oldest logs are removed
    });

    it('should clear all log entries', () => {
      setLoggerConfig({ namespaces: 'test' });
      addLog({ namespace: 'test', level: 'info', params: ['Log entry 1'] });
      addLog({ namespace: 'test', level: 'info', params: ['Log entry 2'] });

      expect(getLogs().length).toBe(2); // Ensure logs are added

      clearLogs();
      expect(getLogs().length).toBe(0); // Ensure logs are cleared
    });

    // Additional tests for extend functionality
    it('should create a sub-logger using extend', () => {
      setLoggerConfig({ namespaces: 'test' });
      const logger = getLogger('test');
      const subLogger = logger.extend('sub');
      subLogger.info('Sub log entry');

      const logs = getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0]?.message).toContain('[test:sub]');
      expect(logs[0]?.message).toContain('Sub log entry');
    });

    it('should create nested sub-loggers using extend', () => {
      setLoggerConfig({ namespaces: 'test' });
      const logger = getLogger('test');
      const subLogger = logger.extend('sub');
      const nestedLogger = subLogger.extend('nested');
      nestedLogger.warn('Nested log entry');

      const logs = getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0]?.message).toContain('[test:sub:nested]');
      expect(logs[0]?.message).toContain('Nested log entry');
    });

    it('should not add log when namespace is disabled', () => {
      setLoggerConfig({ namespaces: 'test:enabled' });
      addLog({
        namespace: 'test:disabled',
        level: 'info',
        params: ['This should not be logged'],
      });
      expect(getLogs()).toHaveLength(0);
    });

    it('should handle complex namespace patterns', () => {
      setNamespaces('ns1:*,ns2,ns3:sub*');
      expect(enabled('ns1:included')).toBe(true);
      expect(enabled('ns1:excluded')).toBe(true);
      expect(enabled('ns2')).toBe(true);
      expect(enabled('ns3')).toBe(false);
      expect(enabled('ns3:sub')).toBe(true);
      expect(enabled('ns3:subtest')).toBe(true);
      expect(enabled('ns4')).toBe(false);
    });

    it('should handle different log levels and Error objects', () => {
      setLoggerConfig({ namespaces: 'test' });
      const consoleMethods = ['log', 'debug', 'info', 'warn', 'error'] as const;
      consoleMethods.forEach((method) => {
        jest.spyOn(console, method).mockImplementation();
        addLog({
          namespace: 'test',
          level: method,
          params: [`${method} message`],
        });
        expect(console[method]).toHaveBeenCalledWith(
          `[test] ${method} message`
        );
        (console[method] as jest.Mock).mockRestore();
      });

      const error = new Error('Test error');
      jest.spyOn(console, 'error').mockImplementation();
      addLog({ namespace: 'test', level: 'error', params: [error] });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[test] Error: Test error')
      );
      (console.error as jest.Mock).mockRestore();

      const logs = getLogs();
      expect(logs[logs.length - 1]?.message).toContain('Test error');
    });
  });

  describe('Logger Configuration', () => {
    beforeEach(resetLoggerAndMocks);

    it('should load settings from localStorage', () => {
      mockGetItem.mockReturnValue('testNamespace');
      reset(); // Re-initialize to load settings again

      expect(enabled('testNamespace')).toBe(true);
      addLog({
        namespace: 'testNamespace',
        level: 'info',
        params: ['Log entry'],
      });
      const logs = getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0]?.message).toContain('Log entry');
    });

    it('should load settings from environment variables', () => {
      mockProcessEnv('DEBUG', 'envNamespace');
      reset(); // Re-initialize to load settings again

      expect(enabled('envNamespace')).toBe(true);
      addLog({
        namespace: 'envNamespace',
        level: 'info',
        params: ['Log entry'],
      });
      const logs = getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0]?.message).toContain('Log entry');
    });

    it('should correctly get and set logger configuration', () => {
      const initialConfig = getLoggerConfig();
      expect(initialConfig).toBeDefined();

      const newConfig = {
        maxLogs: 500,
        namespaces: 'test:*,debug',
      };

      setLoggerConfig(newConfig);

      const updatedConfig = getLoggerConfig();
      expect(updatedConfig.maxLogs).toBe(newConfig.maxLogs);
      expect(updatedConfig.namespaces).toBe(newConfig.namespaces);
    });

    it('should handle empty or whitespace-only namespace strings', () => {
      setNamespaces('   ');
      expect(enabled('any:namespace')).toBe(false);
    });

    it('should initialize debug settings from process.env', () => {
      process.env.DEBUG = 'test:env';
      initializeDebugSettings();
      expect(enabled('test:env')).toBe(true);
    });

    it('should initialize debug settings from localStorage', () => {
      delete process.env.DEBUG;
      mockGetItem.mockReturnValue('test:local');
      initializeDebugSettings();
      expect(enabled('test:local')).toBe(true);
    });
  });

  describe('Logger Utilities', () => {
    it('should handle getLogger for existing and new namespaces', () => {
      const logger1 = getLogger('test');
      const logger2 = getLogger('test');
      expect(logger1).toBe(logger2);

      const newLogger = getLogger('new');
      expect(newLogger).not.toBe(logger1);
    });

    it('should call all logger methods', () => {
      setLoggerConfig({ namespaces: 'test:*' });
      const logger = getLogger('test:logger');

      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'info').mockImplementation();
      jest.spyOn(console, 'debug').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();

      logger.log('Log message');
      logger.info('Info message');
      logger.debug('Debug message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(console.log).toHaveBeenCalledWith('[test:logger] Log message');
      expect(console.info).toHaveBeenCalledWith('[test:logger] Info message');
      expect(console.debug).toHaveBeenCalledWith('[test:logger] Debug message');
      expect(console.warn).toHaveBeenCalledWith('[test:logger] Warn message');
      expect(console.error).toHaveBeenCalledWith('[test:logger] Error message');

      // Test extend method
      const extendedLogger = logger.extend('extended');
      extendedLogger.log('Extended log message');
      expect(console.log).toHaveBeenCalledWith(
        '[test:logger:extended] Extended log message'
      );

      (console.log as jest.Mock).mockRestore();
      (console.info as jest.Mock).mockRestore();
      (console.debug as jest.Mock).mockRestore();
      (console.warn as jest.Mock).mockRestore();
      (console.error as jest.Mock).mockRestore();
    });
  });
});
