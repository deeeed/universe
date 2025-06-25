import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { getLogger, getLogs, clearLogs, setLoggerConfig } from '@siteed/react-native-logger';
import { StyledButton } from './StyledButton';
import { theme } from '../styles/theme';

export const InstanceIsolationDemo = () => {
  const [instance1Logs, setInstance1Logs] = useState<any[]>([]);
  const [instance2Logs, setInstance2Logs] = useState<any[]>([]);

  const handleTestInstances = () => {
    // Configure and use instance 1
    setLoggerConfig({ namespaces: 'instance1:*' }, 'instance1');
    const logger1 = getLogger('instance1:demo', 'instance1');
    
    // Configure and use instance 2
    setLoggerConfig({ namespaces: 'instance2:*' }, 'instance2');
    const logger2 = getLogger('instance2:demo', 'instance2');
    
    // Log to instance 1
    logger1.info('Message from instance 1');
    logger1.debug('Debug from instance 1');
    
    // Log to instance 2
    logger2.info('Message from instance 2');
    logger2.warn('Warning from instance 2');
    
    // Get logs from each instance
    setInstance1Logs(getLogs('instance1'));
    setInstance2Logs(getLogs('instance2'));
  };

  const handleClearInstance1 = () => {
    clearLogs('instance1');
    setInstance1Logs(getLogs('instance1'));
  };

  const handleClearInstance2 = () => {
    clearLogs('instance2');
    setInstance2Logs(getLogs('instance2'));
  };

  const renderLog = ({ item }: { item: any }) => (
    <View style={styles.logItem}>
      <Text style={styles.namespace}>{item.namespace}</Text>
      <Text style={styles.message}>{item.message}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Instance Isolation Demo</Text>
      <Text style={styles.description}>
        Each instance maintains its own configuration and logs independently
      </Text>
      
      <StyledButton title="Test Instance Isolation" onPress={handleTestInstances} variant="primary" />
      
      <View style={styles.instanceContainer}>
        <View style={styles.instance}>
          <Text style={styles.instanceTitle}>Instance 1</Text>
          <StyledButton title="Clear" onPress={handleClearInstance1} variant="danger" size="small" />
          <FlatList
            data={instance1Logs}
            renderItem={renderLog}
            keyExtractor={(item, index) => `instance1-${index}`}
            style={styles.logList}
          />
        </View>
        
        <View style={styles.instance}>
          <Text style={styles.instanceTitle}>Instance 2</Text>
          <StyledButton title="Clear" onPress={handleClearInstance2} variant="danger" size="small" />
          <FlatList
            data={instance2Logs}
            renderItem={renderLog}
            keyExtractor={(item, index) => `instance2-${index}`}
            style={styles.logList}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  instanceContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  instance: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  instanceTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  logList: {
    height: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.light,
  },
  logItem: {
    padding: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  namespace: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  message: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginTop: 2,
  },
});