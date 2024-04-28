import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, Button, type MD3Theme } from 'react-native-paper';
import { useLogger, useLoggerState } from '@siteed/react-native-logger';

export interface LogViewerProps {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const LogViewer = (props: LogViewerProps) => {
  const { clearLogs } = useLogger('log-viewer');
  const { logs, refreshLogs } = useLoggerState();
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  const handleClear = useCallback(async () => {
    clearLogs();
  }, [clearLogs]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.viewer}>
        {logs.map((log, index) => (
          <View key={index} style={styles.logEntry}>
            <View>
              <Text style={styles.timestamp}>{`${log.timestamp ?? ''}`}</Text>
              <Text style={styles.context}>{log.context}</Text>
            </View>
            <Text style={styles.message}>{log.message}</Text>
          </View>
        ))}
      </ScrollView>
      <Button mode="outlined" onPress={refreshLogs}>
        Refresh
      </Button>
      <Button mode="outlined" onPress={handleClear}>
        Clear
      </Button>
    </View>
  );
};

const getStyles = ({ theme }: { theme: MD3Theme }) =>
  StyleSheet.create({
    container: {
      display: 'flex',
      flex: 1,
      gap: 10,
      paddingBottom: 50,
      width: '100%',
      padding: 5,
    },
    context: { color: theme.colors.primary, fontSize: 10, fontWeight: 'bold' },
    logEntry: {},
    message: { fontSize: 10 },
    timestamp: { color: theme.colors.secondary, fontSize: 10 },
    viewer: { borderWidth: 1, flex: 1, minHeight: 100 },
  });
