// packages/react-native-logger/src/logger.core.test.ts
import {
  addLog,
  clearLogs,
  setLoggerConfig,
  getLogs,
  enabled,
} from './logger.core';

describe('Logger Module', () => {
  beforeEach(() => {
    clearLogs();
    setLoggerConfig({ namespaces: '' });
  });

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
    console.log('enabled ns2:subnamespace:file:', enabled('ns2:subnamespace:file'));

    expect(enabled('ns1:file')).toBe(true);
    expect(enabled('ns2:file')).toBe(false);
    expect(enabled('ns2:subnamespace:file')).toBe(true);

    setLoggerConfig({ namespaces: '' });
    console.log('Disabled all namespaces');
    console.log('enabled ns1:file:', enabled('ns1:file'));
    console.log('enabled ns2:subnamespace:file:', enabled('ns2:subnamespace:file'));

    expect(enabled('ns1:file')).toBe(false);
    expect(enabled('ns2:subnamespace:file')).toBe(false);

    setLoggerConfig({ namespaces: 'ns3:file' });
    console.log('Enabled ns3:file');
    console.log('enabled ns3:file:', enabled('ns3:file'));
    console.log('enabled ns2:subnamespace:file:', enabled('ns2:subnamespace:file'));

    expect(enabled('ns3:file')).toBe(true);
    expect(enabled('ns2:subnamespace:file')).toBe(false);
  });
});
