# @siteed/react-native-logger
[![kandi X-Ray](https://kandi.openweaver.com/badges/xray.svg)](https://kandi.openweaver.com/typescript/siteed/react-native-logger)
[![Version](https://img.shields.io/npm/v/@siteed/react-native-logger.svg)](https://www.npmjs.com/package/@siteed/react-native-logger)
![Codecov](https://codecov.io/gh/deeeed/universe/branch/main/graph/badge.svg?flag=react-native-logger)
[![Dependency Status](https://img.shields.io/npm/dt/@siteed/react-native-logger.svg)](https://www.npmjs.com/package/@siteed/react-native-logger)
[![License](https://img.shields.io/npm/l/@siteed/react-native-logger.svg)](https://www.npmjs.com/package/@siteed/react-native-logger)

`@siteed/react-native-logger` is a simple, yet powerful logging library designed for React Native applications. It extends the basic console logging functions by maintaining a log history that can be displayed within your app or exported for troubleshooting.


## Installation

```sh
npm install @siteed/react-native-logger
yarn add @siteed/react-native-logger
```

## Key Features

- **Persistent Log History**: Keeps a history of log messages that can be displayed in-app for easier debugging and diagnostics.
- **Production Debugging**: Facilitates debugging in production by allowing logs to be reviewed directly from a device.
- **Configurable Maximum Logs**: Set the maximum number of logs kept in memory to prevent overflow.
- **Namespace-Based Logging**: Enable or disable logging for specific namespaces based on environment variables or local storage settings.

<div align="center">
  <h2>Try it out</h2>
  <img src="../../docs/loggerdemo.gif" alt="Demo"/>
  <p>Test the logger via a web interface at <a href="https://deeeed.github.io/universe/loggerdemo/">https://deeeed.github.io/universe/loggerdemo/</a></p>
  <p>Full demo is accessible in the monorepo at <code>example/loggerdemo</code></p>
</div>


## Usage

To get started with `@siteed/react-native-logger`, configure the logger settings and use the logging functions within your React components or outside of them.

### Recommended Setup

It is recommended to create a base logger for your project and extend it for any specific features or screens. This approach allows you to isolate logging per application or feature while remaining compatible if an external library also uses a different namespace.

### Basic Setup

```tsx
import { getLogger, setLoggerConfig } from '@siteed/react-native-logger';

// Set logger configuration
setLoggerConfig({ maxLogs: 500, namespaces: 'App:*' }); // Set the maximum number of logs to 500 and enable logging for App namespace

// To use outside react component, you can call getLogger directly
const logger = getLogger('App');
logger.debug('This is a debug message');
logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message');

// Creating a sub-logger
const subLogger = logger.extend('Sub');
subLogger.info('This is a message from the sub-logger');

const App = () => {

  useEffect(() => {
    logger.log('App mounted');
    subLogger.debug('App component mounted');
  }, []);

  return (
    <View>
      <Text>App</Text>
    </View>
  );
};
export default App;
```

### Activating logs with `debug` compatibility

react-native-logger is compatible with the `debug` package, allowing you to enable or disable logging for specific namespaces based on environment variables or local storage settings. This is particularly useful for controlling log output in different environments (development, staging, production).

#### Environment Variables (nodejs)

To activate logs for specific namespaces using environment variables:

```sh
# Enable all logs
export DEBUG=*

# Enable logs for specific namespaces
export DEBUG=namespace1,namespace2
```

#### Local Storage (web)

To activate logs for specific namespaces using local storage (e.g., in a browser environment):

```js
// Enable all logs
localStorage.setItem('DEBUG', '*');

// Enable logs for specific namespaces
localStorage.setItem('DEBUG', 'namespace1,namespace2');
```

### Accessing logs in Production

`@siteed/react-native-logger` is particularly useful in production, where traditional debugging tools are not accessible. For instance, you can create a dedicated screen within your app that displays log history, allowing users to copy and send these logs for support purposes, or even set up automatic log forwarding via email or a web service.

```tsx
import { getLogger, getLogs, clearLogs } from '@siteed/react-native-logger';
import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList } from 'react-native';

const LogScreen = () => {
  const [logs, setLogs] = useState(getLogs());

  const handleSendLogs = async () => {
    const logData = logs.map(log => `${new Date(log.timestamp).toLocaleString()}: ${log.message}`).join('\n');
    await sendLogsToSupport(logData); // Define this function to match your backend support system
  };

  useEffect(() => {
    setLogs(getLogs()); // Refresh logs when component mounts
  }, []);

  const renderItem = ({ item }: ListRenderItemInfo<typeof logs[0]>) => (
    <View style={styles.logEntry}>
      <View>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
        <Text style={styles.context}>{item.namespace}</Text>
      </View>
      <Text style={styles.message}>{item.message}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
       <FlatList
        data={filteredLogs}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${index}-${item.timestamp}`}
        style={styles.viewer}
        initialNumToRender={20} // Adjust based on performance requirements
      />
      <Button title="Send Logs to Support" onPress={handleSendLogs} />
    </View>
  );
};

export default LogScreen;
```

## License

MIT
