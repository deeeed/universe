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
import { DEFAULT_MAX_LOGS, DEFAULT_NAMESPACES, getState } from './logger.state';
import { coerceToString, safeStringify } from './logger.utils';

export const mockGetItem = jest.fn();
export const mockSetItem = jest.fn();
export const mockRemoveItem = jest.fn();

// Create localStorage mock only if window exists
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: mockGetItem,
      setItem: mockSetItem,
      removeItem: mockRemoveItem,
      clear: jest.fn(),
    },
    writable: true,
  });
}

export const mockProcessEnv = (key: string, value: string) => {
  process.env[key] = value;
};

// Utility functions for initializing and resetting the logger
const initializeLogger = () => {
  clearLogs();
  setLoggerConfig({ namespaces: '' });
  // Ensure we're not in a browser environment for most tests
  // @ts-ignore
  delete global.window;
};

const resetLoggerAndMocks = () => {
  reset();
  mockGetItem.mockClear();
  // Ensure we're not in a browser environment for most tests
  // @ts-ignore
  delete global.window;
};

// Reset without initializing for lazy initialization tests
const resetWithoutInit = (instanceId?: string) => {
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
  // Don't call initializeDebugSettings
  // Ensure we're not in a browser environment for most tests
  // @ts-ignore
  delete global.window;
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

    it('should handle Error objects correctly', () => {
      setLoggerConfig({ namespaces: 'test' });
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at TestFunction (test.js:1:1)';

      jest.spyOn(console, 'error').mockImplementation();
      addLog({ namespace: 'test', level: 'error', params: [error] });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          '[test] Error: Test error\n    at TestFunction (test.js:1:1)'
        )
      );

      const logs = getLogs();
      expect(logs[logs.length - 1]?.message).toContain('Error: Test error');
      expect(logs[logs.length - 1]?.message).toContain(
        'at TestFunction (test.js:1:1)'
      );

      (console.error as jest.Mock).mockRestore();
    });

    it('should handle Error objects without stack trace', () => {
      setLoggerConfig({ namespaces: 'test' });
      const error = new Error('Test error without stack');
      error.stack = undefined;

      jest.spyOn(console, 'error').mockImplementation();
      addLog({ namespace: 'test', level: 'error', params: [error] });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[test] Test error without stack')
      );

      const logs = getLogs();
      expect(logs[logs.length - 1]?.message).toContain(
        'Test error without stack'
      );

      (console.error as jest.Mock).mockRestore();
    });

    it('should handle non-string, non-Error messages', () => {
      setLoggerConfig({ namespaces: 'test' });
      const complexObject = { key: 'value', nested: { array: [1, 2, 3] } };

      jest.spyOn(console, 'log').mockImplementation();
      addLog({ namespace: 'test', level: 'log', params: [complexObject] });

      expect(console.log).toHaveBeenCalledWith('[test] ', complexObject);

      const logs = getLogs();
      expect(logs[logs.length - 1]?.message).toContain('[test] ');
      expect(logs[logs.length - 1]?.message).toContain(
        JSON.stringify(complexObject)
      );

      (console.log as jest.Mock).mockRestore();
    });

    it('should handle multiple parameters correctly', () => {
      setLoggerConfig({ namespaces: 'test' });
      const message = 'Test message';
      const additionalParam1 = { key: 'value' };
      const additionalParam2 = [1, 2, 3];

      jest.spyOn(console, 'log').mockImplementation();
      addLog({
        namespace: 'test',
        level: 'log',
        params: [message, additionalParam1, additionalParam2],
      });

      expect(console.log).toHaveBeenCalledWith(
        '[test] Test message',
        additionalParam1,
        additionalParam2
      );

      const logs = getLogs();
      expect(logs[logs.length - 1]?.message).toContain('[test] Test message');
      expect(logs[logs.length - 1]?.message).toContain(
        JSON.stringify(additionalParam1)
      );
      expect(logs[logs.length - 1]?.message).toContain(
        JSON.stringify(additionalParam2)
      );

      (console.log as jest.Mock).mockRestore();
    });

    it('should handle null message correctly', () => {
      setLoggerConfig({ namespaces: 'test' });

      jest.spyOn(console, 'log').mockImplementation();
      addLog({ namespace: 'test', level: 'log', params: [null] });

      expect(console.log).toHaveBeenCalledWith('[test] ', null);

      const logs = getLogs();
      expect(logs[logs.length - 1]?.message).toContain('[test] ');
      expect(logs[logs.length - 1]?.message).toContain('null');

      (console.log as jest.Mock).mockRestore();
    });

    it('should handle addLog call without params', () => {
      setLoggerConfig({ namespaces: 'test' });

      jest.spyOn(console, 'log').mockImplementation();
      addLog({ namespace: 'test', level: 'log' });

      expect(console.log).toHaveBeenCalledWith('[test] ');

      const logs = getLogs();
      expect(logs[logs.length - 1]?.message).toContain('[test] ');

      (console.log as jest.Mock).mockRestore();
    });
  });

  describe('Logger Configuration', () => {
    beforeEach(() => {
      resetLoggerAndMocks();
      // Restore window for localStorage tests
      global.window = { localStorage: { getItem: mockGetItem, setItem: mockSetItem, removeItem: mockRemoveItem, clear: jest.fn() } } as any;
    });

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
      // Restore window for localStorage test
      global.window = { localStorage: { getItem: mockGetItem } } as any;
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

    it('should safely stringify circular objects', () => {
      const circularObj: { a: number; self?: unknown } = { a: 1 };
      circularObj.self = circularObj;

      const result = safeStringify(circularObj);
      expect(result).toContain('"a":1');
      expect(result).toContain('"self":"[Circular]"');
    });

    it('should coerce various types to string', () => {
      expect(coerceToString(undefined)).toBe('');
      expect(coerceToString('string')).toBe('string');
      expect(coerceToString({ a: 1 })).toBe('{"a":1}');
      expect(coerceToString([1, 2, 3])).toBe('[1,2,3]');

      const circularObj: { a: number; self?: unknown } = { a: 1 };
      circularObj.self = circularObj;
      expect(coerceToString(circularObj)).toContain('"self":"[Circular]"');
    });
  });

  describe('Console Output Control', () => {
    beforeEach(() => {
      resetLoggerAndMocks();
      jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      (console.log as jest.Mock).mockRestore();
    });

    it('should print all params to console when disableExtraParamsInConsole is false', () => {
      setLoggerConfig({
        namespaces: 'test',
        disableExtraParamsInConsole: false,
      });
      const logger = getLogger('test');
      logger.log('Test message', { key: 'value' }, [1, 2, 3]);

      expect(console.log).toHaveBeenCalledWith(
        '[test] Test message',
        { key: 'value' },
        [1, 2, 3]
      );
    });

    it('should only print the first param to console when disableExtraParamsInConsole is true', () => {
      setLoggerConfig({
        namespaces: 'test',
        disableExtraParamsInConsole: true,
      });
      const logger = getLogger('test');
      logger.log('Test message', { key: 'value' }, [1, 2, 3]);

      expect(console.log).toHaveBeenCalledWith('[test] Test message');
    });

    it('should still save all params in memory when disableExtraParamsInConsole is true', () => {
      setLoggerConfig({
        namespaces: 'test',
        disableExtraParamsInConsole: true,
      });
      const logger = getLogger('test');
      logger.log('Test message', { key: 'value' }, [1, 2, 3]);

      const logs = getLogs();
      expect(logs.length).toBe(1);

      const lastLog = logs[logs.length - 1];
      expect(lastLog).toBeDefined();
      if (lastLog) {
        expect(lastLog.message).toContain('Test message');
        expect(lastLog.message).toContain('{"key":"value"}');
        expect(lastLog.message).toContain('[1,2,3]');
      }
    });
  });

  describe('Instance Isolation', () => {
    beforeEach(() => {
      resetLoggerAndMocks();
      // Reset all instances for clean test isolation
      reset('instance1');
      reset('instance2');
      reset('testInstance');
    });

    it('should maintain separate state for different instances', () => {
      // Configure instance1
      setLoggerConfig({ namespaces: 'app:*' }, 'instance1');
      const logger1 = getLogger('app:test', 'instance1');
      logger1.info('Instance 1 message');

      // Configure instance2
      setLoggerConfig({ namespaces: 'lib:*' }, 'instance2');
      const logger2 = getLogger('lib:test', 'instance2');
      logger2.info('Instance 2 message');

      // Check logs are isolated
      const logs1 = getLogs('instance1');
      const logs2 = getLogs('instance2');

      expect(logs1.length).toBe(1);
      expect(logs2.length).toBe(1);
      expect(logs1[0]?.message).toContain('Instance 1 message');
      expect(logs2[0]?.message).toContain('Instance 2 message');
    });

    it('should use default instance when instanceId is not provided', () => {
      setLoggerConfig({ namespaces: 'test' });
      const logger = getLogger('test');
      logger.info('Default instance message');

      const defaultLogs = getLogs();
      const explicitDefaultLogs = getLogs('default');

      expect(defaultLogs).toEqual(explicitDefaultLogs);
      expect(defaultLogs.length).toBe(1);
      expect(defaultLogs[0]?.message).toContain('Default instance message');
    });

    it('should cache loggers with composite keys for instances', () => {
      const logger1a = getLogger('test:namespace', 'instance1');
      const logger1b = getLogger('test:namespace', 'instance1');
      const logger2 = getLogger('test:namespace', 'instance2');
      const loggerDefault = getLogger('test:namespace');

      // Same instance should return same logger
      expect(logger1a).toBe(logger1b);
      // Different instances should return different loggers
      expect(logger1a).not.toBe(logger2);
      expect(logger1a).not.toBe(loggerDefault);
    });

    it('should isolate configuration between instances', () => {
      setLoggerConfig({ maxLogs: 5, namespaces: 'app:*' }, 'instance1');
      setLoggerConfig({ maxLogs: 10, namespaces: 'lib:*' }, 'instance2');

      const config1 = getLoggerConfig('instance1');
      const config2 = getLoggerConfig('instance2');

      expect(config1.maxLogs).toBe(5);
      expect(config1.namespaces).toBe('app:*');
      expect(config2.maxLogs).toBe(10);
      expect(config2.namespaces).toBe('lib:*');
    });

    it('should clear logs only for specified instance', () => {
      setLoggerConfig({ namespaces: '*' }, 'instance1');
      setLoggerConfig({ namespaces: '*' }, 'instance2');

      addLog(
        { namespace: 'test', level: 'info', params: ['Message 1'] },
        'instance1'
      );
      addLog(
        { namespace: 'test', level: 'info', params: ['Message 2'] },
        'instance2'
      );

      clearLogs('instance1');

      expect(getLogs('instance1').length).toBe(0);
      expect(getLogs('instance2').length).toBe(1);
    });

    it('should reset only specified instance', () => {
      // Clear localStorage to ensure clean test
      mockGetItem.mockReturnValue(null);

      setLoggerConfig({ namespaces: 'test', maxLogs: 50 }, 'instance1');
      setLoggerConfig({ namespaces: 'other', maxLogs: 75 }, 'instance2');

      reset('instance1');

      const config1 = getLoggerConfig('instance1');
      const config2 = getLoggerConfig('instance2');

      expect(config1.maxLogs).toBe(DEFAULT_MAX_LOGS);
      expect(config1.namespaces).toBe(DEFAULT_NAMESPACES);
      expect(config2.maxLogs).toBe(75);
      expect(config2.namespaces).toBe('other');
    });
  });

  describe('Lazy Initialization', () => {
    beforeEach(() => {
      // Use resetWithoutInit to avoid auto-initialization
      resetWithoutInit();
      resetWithoutInit('testInstance');
      delete process.env.DEBUG;
      mockGetItem.mockClear();
      mockGetItem.mockReturnValue(null);
    });

    it('should initialize debug settings on first getLogger call', () => {
      // Set DEBUG after import but before getLogger
      process.env.DEBUG = 'lazy:*';

      const logger = getLogger('lazy:test');
      logger.info('Lazy loaded message');

      const logs = getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0]?.message).toContain('Lazy loaded message');
    });

    it('should initialize debug settings on first enabled call', () => {
      // Set DEBUG after import but before enabled check
      process.env.DEBUG = 'lazy:*';

      expect(enabled('lazy:test')).toBe(true);
      expect(enabled('other:test')).toBe(false);
    });

    it('should only initialize once per instance', () => {
      jest.spyOn(console, 'log').mockImplementation();

      process.env.DEBUG = 'init:*';

      // First call should initialize
      const logger1 = getLogger('init:test', 'testInstance');
      // Second call should not re-initialize
      const logger2 = getLogger('init:another', 'testInstance');

      // Change DEBUG - should not affect already initialized instance
      process.env.DEBUG = 'different:*';
      const logger3 = getLogger('init:third', 'testInstance');

      logger1.info('Message 1');
      logger2.info('Message 2');
      logger3.info('Message 3');

      const logs = getLogs('testInstance');
      expect(logs.length).toBe(3); // All messages logged because init:* was set during initialization

      (console.log as jest.Mock).mockRestore();
    });

    it('should support localStorage for lazy initialization', () => {
      delete process.env.DEBUG;
      // Restore window for localStorage test
      global.window = { localStorage: { getItem: mockGetItem } } as any;
      mockGetItem.mockReturnValue('localStorage:*');

      const logger = getLogger('localStorage:test');
      logger.info('LocalStorage message');

      const logs = getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0]?.message).toContain('LocalStorage message');
    });
  });

  describe('Regex Namespace Optimization', () => {
    beforeEach(resetLoggerAndMocks);

    it('should compile namespace patterns into regex', () => {
      setNamespaces('app:*, lib:specific, test:prefix*');

      expect(enabled('app:anything')).toBe(true);
      expect(enabled('app:nested:deep')).toBe(true);
      expect(enabled('lib:specific')).toBe(true);
      expect(enabled('lib:other')).toBe(false);
      expect(enabled('test:prefix')).toBe(true);
      expect(enabled('test:prefixed')).toBe(true);
      expect(enabled('test:other')).toBe(false);
    });

    it('should handle special regex characters in namespaces', () => {
      setNamespaces('app[test], app.test, app+test, app?test');

      expect(enabled('app[test]')).toBe(true);
      expect(enabled('app.test')).toBe(true);
      expect(enabled('app+test')).toBe(true);
      expect(enabled('app?test')).toBe(true);
      expect(enabled('apptest')).toBe(false); // . should not match any character
    });

    it('should handle empty namespace configuration', () => {
      setNamespaces('');
      expect(enabled('anything')).toBe(false);
    });

    it('should update regex when namespaces change', () => {
      setNamespaces('first:*');
      expect(enabled('first:test')).toBe(true);
      expect(enabled('second:test')).toBe(false);

      setNamespaces('second:*');
      expect(enabled('first:test')).toBe(false);
      expect(enabled('second:test')).toBe(true);
    });

    it('should handle complex namespace patterns efficiently', () => {
      const complexPattern = Array.from(
        { length: 50 },
        (_, i) => `namespace${i}:*`
      ).join(',');
      setNamespaces(complexPattern);

      // Test that pattern matching works
      expect(enabled('namespace25:test')).toBe(true);
      expect(enabled('namespace49:deep:nested')).toBe(true);
      expect(enabled('namespace50:test')).toBe(false);
      expect(enabled('other:test')).toBe(false);
    });
  });

  describe('Colorization', () => {
    let originalEnv: string | undefined;
    let originalTTY: boolean | undefined;
    let originalWindow: any;

    beforeEach(() => {
      resetLoggerAndMocks();
      originalEnv = process.env.NODE_ENV;
      originalTTY = process.stdout?.isTTY;
      originalWindow = global.window;
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'info').mockImplementation();
      jest.spyOn(console, 'debug').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      if (process.stdout) {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: originalTTY,
          writable: true,
          configurable: true,
        });
      }
      global.window = originalWindow;
      (console.log as jest.Mock).mockRestore();
      (console.info as jest.Mock).mockRestore();
      (console.debug as jest.Mock).mockRestore();
      (console.warn as jest.Mock).mockRestore();
      (console.error as jest.Mock).mockRestore();
    });

    it('should apply ANSI colors in development with TTY', () => {
      process.env.NODE_ENV = 'development';
      if (process.stdout) {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: true,
          writable: true,
          configurable: true,
        });
      }
      // Ensure window is not defined for terminal test
      // @ts-ignore
      delete global.window;

      setLoggerConfig({ namespaces: 'color:*' });
      const logger = getLogger('color:test');
      logger.log('Colored message');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          // eslint-disable-next-line no-control-regex
          /\x1b\[3[0-9]m\[color:test\] Colored message\x1b\[0m/
        )
      );
    });

    it('should apply CSS colors in browser development', () => {
      process.env.NODE_ENV = 'development';
      if (process.stdout) {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: false,
          writable: true,
          configurable: true,
        });
      }
      // Mock browser environment
      // @ts-ignore
      global.window = { console };

      setLoggerConfig({ namespaces: 'color:*' });
      const logger = getLogger('color:test');
      logger.info('Browser colored message');

      expect(console.info).toHaveBeenCalledWith(
        '%c[color:test] Browser colored message',
        expect.stringMatching(/color: #[0-9a-f]{6}; font-weight: bold;/)
      );
    });

    it('should not apply colors in production', () => {
      process.env.NODE_ENV = 'production';
      if (process.stdout) {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: true,
          writable: true,
          configurable: true,
        });
      }

      setLoggerConfig({ namespaces: 'color:*' });
      const logger = getLogger('color:test');
      logger.log('No color message');

      expect(console.log).toHaveBeenCalledWith('[color:test] No color message');
    });

    it('should not apply colors without TTY or browser', () => {
      process.env.NODE_ENV = 'development';
      if (process.stdout) {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: false,
          writable: true,
          configurable: true,
        });
      }
      // @ts-ignore
      delete global.window;

      setLoggerConfig({ namespaces: 'color:*' });
      const logger = getLogger('color:test');
      logger.log('No TTY message');

      expect(console.log).toHaveBeenCalledWith('[color:test] No TTY message');
    });

    it('should use consistent colors for same namespace', () => {
      process.env.NODE_ENV = 'development';
      if (process.stdout) {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: true,
          writable: true,
          configurable: true,
        });
      }

      setLoggerConfig({ namespaces: 'consistent:*' });
      const logger = getLogger('consistent:test');

      logger.log('Message 1');
      logger.log('Message 2');

      const calls = (console.log as jest.Mock).mock.calls;
      expect(calls[0][0]).toEqual(
        calls[1][0].replace('Message 2', 'Message 1')
      );
    });

    it('should not include colors in stored log messages', () => {
      process.env.NODE_ENV = 'development';
      if (process.stdout) {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: true,
          writable: true,
          configurable: true,
        });
      }

      setLoggerConfig({ namespaces: 'stored:*' });
      const logger = getLogger('stored:test');
      logger.log('Stored message');

      const logs = getLogs();
      expect(logs[0]?.message).not.toMatch(/\\x1b/);
      expect(logs[0]?.message).toContain('[stored:test] Stored message');
    });
  });
});
