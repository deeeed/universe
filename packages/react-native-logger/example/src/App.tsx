import * as React from 'react';
import {
  LoggerProvider,
  getLogger,
  useLogger,
} from '@siteed/react-native-logger';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StyleSheet, View, Text } from 'react-native';
import { LogViewer } from './log-viewer';
import { Button } from 'react-native-paper';

const outLogger = getLogger('out');
outLogger.log('outLogger.log');

const Other = () => {
  const { logger } = useLogger('Other');
  return (
    <View>
      <Button mode="outlined" onPress={() => logger.log('Button pressed')}>
        Other Component Button
      </Button>
    </View>
  );
};
export function App() {
  const { logger } = useLogger('App');

  React.useEffect(() => {
    logger.debug(`App mounted`, [1], 2, [3]);
  }, [logger]);

  return (
    <View style={styles.container}>
      <Text>Check logs...</Text>
      <Other />
      <Button mode="outlined" onPress={() => logger.debug('Button pressed')}>
        App Component Button
      </Button>
      <LogViewer />
    </View>
  );
}

export default function WithLogger() {
  return (
    <SafeAreaProvider>
      <LoggerProvider>
        <App />
      </LoggerProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    flex: 1,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
