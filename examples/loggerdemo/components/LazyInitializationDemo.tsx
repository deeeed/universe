import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, Alert } from 'react-native';
import { getLogger, reset, getLogs } from '@siteed/react-native-logger';

export const LazyInitializationDemo = () => {
  const [debugValue, setDebugValue] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const handleSetDebugEnv = () => {
    // In a real scenario, this would be set before importing the logger
    // Here we're simulating it by resetting and setting the env var
    if (typeof process !== 'undefined' && process.env) {
      process.env.DEBUG = debugValue;
      reset(); // Reset to force re-initialization
      setLogs([`Set DEBUG environment variable to: ${debugValue}`]);
    } else {
      Alert.alert('Note', 'process.env not available in this environment');
    }
  };

  const handleTestLogger = () => {
    const logger1 = getLogger('test:module1');
    const logger2 = getLogger('test:module2');
    const logger3 = getLogger('other:module');

    logger1.info('Message from test:module1');
    logger2.info('Message from test:module2');
    logger3.info('Message from other:module');

    const allLogs = getLogs();
    const logMessages = allLogs.map(log => `[${log.namespace}] ${log.message}`);
    setLogs(prev => [...prev, ...logMessages]);
  };

  const handleClear = () => {
    setLogs([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lazy Initialization Demo</Text>
      <Text style={styles.description}>
        The logger now supports setting DEBUG environment variable after import
      </Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={debugValue}
          onChangeText={setDebugValue}
          placeholder="Enter DEBUG value (e.g., test:*)"
        />
        <Button title="Set DEBUG" onPress={handleSetDebugEnv} />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Test Loggers" onPress={handleTestLogger} />
        <Button title="Clear" onPress={handleClear} />
      </View>

      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </View>

      <View style={styles.exampleContainer}>
        <Text style={styles.exampleTitle}>Examples to try:</Text>
        <Text style={styles.exampleText}>• test:* (matches test:module1, test:module2)</Text>
        <Text style={styles.exampleText}>• test:module1 (matches only test:module1)</Text>
        <Text style={styles.exampleText}>• other:* (matches other:module)</Text>
        <Text style={styles.exampleText}>• * (matches all)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginRight: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  logsContainer: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
  },
  logsTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  logText: {
    fontSize: 12,
    marginBottom: 2,
  },
  exampleContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
  },
  exampleTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  exampleText: {
    fontSize: 12,
    marginBottom: 2,
  },
});