// packages/react-native-logger/src/logger.core.test.ts
import {
  addLog,
  clearLogs,
  setLoggerConfig,
  getLogs,
  enabled,
  reset,
  getLogger,
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
      console.log('Enabled ns1:* and ns2:subnamespace');
      console.log('enabled ns1:file:', enabled('ns1:file'));
      console.log('enabled ns2:file:', enabled('ns2:file'));
      console.log(
        'enabled ns2:subnamespace:file:',
        enabled('ns2:subnamespace:file')
      );

      expect(enabled('ns1:file')).toBe(true);
      expect(enabled('ns2:file')).toBe(false);
      expect(enabled('ns2:subnamespace:file')).toBe(true);

      setLoggerConfig({ namespaces: '' });
      console.log('Disabled all namespaces');
      console.log('enabled ns1:file:', enabled('ns1:file'));
      console.log(
        'enabled ns2:subnamespace:file:',
        enabled('ns2:subnamespace:file')
      );

      expect(enabled('ns1:file')).toBe(false);
      expect(enabled('ns2:subnamespace:file')).toBe(false);

      setLoggerConfig({ namespaces: 'ns3:file' });
      console.log('Enabled ns3:file');
      console.log('enabled ns3:file:', enabled('ns3:file'));
      console.log(
        'enabled ns2:subnamespace:file:',
        enabled('ns2:subnamespace:file')
      );

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
  });

  describe('Logger Configuration Loading', () => {
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
  });
});
