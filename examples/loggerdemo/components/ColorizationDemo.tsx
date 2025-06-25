import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { getLogger, setLoggerConfig } from '@siteed/react-native-logger';

export const ColorizationDemo = () => {
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

  const handleTestColorization = () => {
    // Note: Colors only appear in terminal/console output, not in the UI
    setLoggerConfig({ namespaces: 'color:*' });
    
    const modules = ['auth', 'api', 'database', 'ui', 'network', 'cache'];
    const loggers = modules.map(module => getLogger(`color:${module}`));
    
    // Simulate console output
    const output: string[] = [];
    output.push('Check your terminal/console to see colorized output!');
    output.push('');
    output.push('In development mode with terminal support, each namespace gets a unique color:');
    
    loggers.forEach((logger, index) => {
      const namespace = `color:${modules[index]}`;
      logger.info(`Message from ${namespace}`);
      output.push(`• ${namespace} - will have its own color`);
    });
    
    setConsoleOutput(output);
    
    Alert.alert(
      'Colorization Active',
      'Check your console output to see the colorized logs:\n\n• Web: Open Developer Console (F12)\n• Terminal: Colors visible if TTY supports ANSI'
    );
  };

  const handleTestManyNamespaces = () => {
    setLoggerConfig({ namespaces: 'app:*' });
    
    // Create many loggers to demonstrate color cycling
    const output: string[] = ['Testing color distribution across many namespaces...'];
    
    for (let i = 1; i <= 16; i++) {
      const logger = getLogger(`app:module${i}`);
      logger.debug(`Debug message from module ${i}`);
    }
    
    output.push('Created 16 different loggers - check console for color distribution');
    setConsoleOutput(output);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Colorization Demo</Text>
      <Text style={styles.description}>
        Logger output is now colorized in development mode when using a terminal that supports ANSI colors
      </Text>
      
      <View style={styles.buttonContainer}>
        <Button title="Test Basic Colorization" onPress={handleTestColorization} />
        <Button title="Test Many Namespaces" onPress={handleTestManyNamespaces} />
      </View>

      <View style={styles.outputContainer}>
        <Text style={styles.outputTitle}>Info:</Text>
        {consoleOutput.map((line, index) => (
          <Text key={index} style={styles.outputText}>{line}</Text>
        ))}
      </View>

      <View style={styles.noteContainer}>
        <Text style={styles.noteTitle}>Note:</Text>
        <Text style={styles.noteText}>
          • Colors appear in terminal/console output
        </Text>
        <Text style={styles.noteText}>
          • In web browsers: Open Developer Console (F12) to see CSS colors
        </Text>
        <Text style={styles.noteText}>
          • In terminals: Works with TTY terminals that support ANSI colors
        </Text>
        <Text style={styles.noteText}>
          • Each namespace gets a consistent color based on hash
        </Text>
        <Text style={styles.noteText}>
          • 8 different colors available for variety
        </Text>
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  outputContainer: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
  },
  outputTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  outputText: {
    fontSize: 12,
    marginBottom: 2,
  },
  noteContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
  },
  noteTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  noteText: {
    fontSize: 12,
    marginBottom: 2,
  },
});