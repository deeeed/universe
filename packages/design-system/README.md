# @siteed/design-system
[![kandi X-Ray](https://kandi.openweaver.com/badges/xray.svg)](https://kandi.openweaver.com/typescript/siteed/design-system)
[![Version](https://img.shields.io/npm/v/@siteed/design-system.svg)](https://www.npmjs.com/package/@siteed/design-system)
[![Dependency Status](https://img.shields.io/npm/dt/@siteed/design-system.svg)](https://www.npmjs.com/package/@siteed/design-system)
[![License](https://img.shields.io/npm/l/@siteed/design-system.svg)](https://www.npmjs.com/package/@siteed/design-system)


## Introduction

`@siteed/design-system` is a comprehensive cross-platform design system built around Expo for cross-platform applications. It extends react-native-paper to provide a robust set of UI components that are easy to implement and customize. Designed with an opinionated selection of libraries, it simplifies the integration process and reduces setup time, allowing developers to focus on building high-quality mobile apps efficiently.

## Key Features

- **Opinionated Library Choices**: Includes essential libraries such as `react-native-paper`, `react-native-safe-area-context`, `react-native-reanimated`, ensuring compatibility and functionality.
- **Ready-to-Use Components**: From typography to modals, get access to a variety of UI components that are production-ready and customizable.
- **Streamlined Configuration**: Pre-configured settings and integrations to speed up the development process, making it ideal for rapid prototyping and production projects.

## Installation
```bash
npx expo install @siteed/design-system @siteed/react-native-logger react-native-paper react-native-safe-area-context @gorhom/bottom-sheet@5.0.0-alpha.11 react-native-gesture-handler @expo/vector-icons expo-localization react-native-reanimated react-native-screens react-native-vector-icons @react-navigation/native
```

### with web support
```bash
npx expo install react-dom react-native-web @expo/metro-runtime react-native-web
npx expo customize metro.config.js
```

## Usage

Quickly integrate the design system into your app by importing and using the provided components and utilities:

```tsx
import 'intl-pluralrules';
// Keep polyfills on top
import { LabelSwitch, ScreenWrapper, UIProvider, useThemePreferences, Picker, SelectOption } from "@siteed/design-system";
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import React from 'react';

export function App() {
  const { toggleDarkMode, darkMode } = useThemePreferences()
  const [options, setOptions] = React.useState<SelectOption[]>([{ label: 'Option 1', value: 'option1', selected: true }, { label: 'Option 2', value: 'option2' }])
  return (
    <ScreenWrapper withScrollView contentContainerStyle={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <View style={{width: '100%'}}>
        <LabelSwitch label="Dark Mode" value={darkMode} onValueChange={toggleDarkMode} />
        <Picker label="Category" options={options} onFinish={setOptions} />
      </View>
      <StatusBar style="auto" />
    </ScreenWrapper>
  );
}

export default function WrapApp() {
  return (
      <UIProvider>
        <App />
      </UIProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

For a full list of components and their usage, you can explore the storybook

## Storybook

Explore the components and their usage more thoroughly by running the Storybook locally:


```bash
yarn storybook
```

## Documentation

For more detailed information on the design system and its components, check out the storybook site at [https://deeeed.github.io/universe/design-system-storybook/](https://deeeed.github.io/universe/design-system-storybook/)

