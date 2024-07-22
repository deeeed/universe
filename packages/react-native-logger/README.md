# @siteed/react-native-logger

`@siteed/react-native-logger` is a simple, yet powerful logging library designed for React Native applications. It extends the basic console logging functions by maintaining a log history that can be displayed within your app or exported for troubleshooting. Additionally, it is compatible with the `debug` package, allowing you to enable or disable logging based on environment variables or local storage settings.


## Installation

```sh
npm install @siteed/react-native-logger
```

## Key Features

- **Easy Integration**: Seamlessly integrates with any React Native project.
- **Persistent Log History**: Keeps a history of log messages that can be displayed in-app for easier debugging and diagnostics.
- **Production Debugging**: Facilitates debugging in production by allowing logs to be reviewed directly from a device.
- **Configurable Maximum Logs**: Set the maximum number of logs kept in memory to prevent overflow.
- **Compatibility with `debug` Package**: Enable or disable logging for specific namespaces based on environment variables or local storage settings.

<div align="center">
  <h2>Try it out</h2>
  <img src="./docs/loggerdemo.gif" alt="Demo"/>
  <p>Test the logger via a web interface at <a href="https://deeeed.github.io/universe/loggerdemo/">https://deeeed.github.io/universe/loggerdemo/</a></p>
  <p>Full demo is accessible in the monorepo at <code>example/loggerdemo</code></p>
</div>


## Usage

To get started with `@siteed/react-native-logger`, configure the logger settings and use the logging functions within your React components or outside of them.

### Basic Setup

```tsx
import { LoggerProvider, useLogger, getLogger, setLoggerConfig } from '@siteed/react-native-logger';

// Set logger configuration
setLoggerConfig({ maxLogs: 500 }); // Set the maximum number of logs to 500

// To use outside react component, you can call getLogger directly
const outLogger = getLogger('out');
outLogger.debug('This is a debug message');
outLogger.info('This is an info message');
outLogger.warn('This is a warning message');
outLogger.error('This is an error message');

const App = () => {
  const logger = useLogger('App');

  useEffect(() => {
    logger.log('App mounted');
  }, [logger]);

  return (
    <View>
      <Text>App</Text>
    </View>
  );
};
export default App
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

# Disable logs for specific namespaces
export DEBUG=-namespace1,-namespace2
```

#### Local Storage (web)

To activate logs for specific namespaces using local storage (e.g., in a browser environment):

```js
// Enable all logs
localStorage.setItem('DEBUG', '*');

// Enable logs for specific namespaces
localStorage.setItem('DEBUG', 'namespace1,namespace2');

// Disable logs for specific namespaces
localStorage.setItem('DEBUG', '-namespace1,-namespace2');
```

### Accessing logs in Production

`@siteed/react-native-logger` is particularly useful in production, where traditional debugging tools are not accessible. For instance, you can create a dedicated screen within your app that displays log history, allowing users to copy and send these logs for support purposes, or even set up automatic log forwarding via email or a web service.

```tsx
import { useLogger, getLogger, setLoggerConfig } from '@siteed/react-native-logger';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';

const LogScreen = () => {
  const [logs, setLogs] = useState(getLogs());

  const handleSendLogs = async () => {
    const logData = logs.map(log => `${new Date(log.timestamp).toLocaleString()}: ${log.message}`).join('\n');
    await sendLogsToSupport(logData); // Define this function to match your backend support system
  };

  useEffect(() => {
    setLogs(getLogs()); // Refresh logs when component mounts
  }, []);

  return (
     <View>
      <ScrollView>
        {logs.map((log, index) => (
          <View key={index}>
            <Text>{`${new Date(log.timestamp).toLocaleString()}: ${log.message}`}</Text>
          </View>
        ))}
      </ScrollView>
      <Button title="Send Logs to Support" onPress={handleSendLogs} />
    </View>
  );
};

export default LogScreen;
```

## License

MIT
