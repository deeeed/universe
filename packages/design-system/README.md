# @siteed/design-system

## Introduction

`@siteed/design-system` is a comprehensive cross-platform design system built for Expo and React Native. It extends react-native-paper to provide a robust set of UI components that are easy to implement and customize. Designed with an opinionated selection of libraries, it simplifies the integration process and reduces setup time, allowing developers to focus on building high-quality mobile apps efficiently.

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


## Providers

The `UIProvider` aims to simplify application code by providing a single customizable provider that integrates multiple global state management functionalities. This unified provider streamlines the setup and maintenance of theme preferences, language settings, toast notifications, and more, ensuring a cohesive and consistent user experience.

### UIProvider

The `UIProvider` combines various providers and hooks to manage global states such as theme preferences, language settings, toast notifications, and confirmation dialogs. The following sections describe each component's role and how they interact within the `UIProvider`.

- **Role**: Main provider that combines all other providers to manage global states and preferences.
- **Props**:
  - `locale`: Sets the language locale.
  - `actions`: Partial actions for theme preferences.
  - `safeAreaProviderProps`: Props for `SafeAreaProvider`.
  - `toastProviderProps`: Props for `ToastProvider`.
  - `confirmProviderProps`: Props for `ConfirmProvider`.
  - `preferences`: Partial theme preferences.
  - `darkTheme`: Custom dark theme.
  - `lightTheme`: Custom light theme.
  - `children`: React nodes to be rendered within the provider.

### LanguageProvider

- **Role**: Initializes and provides the i18n translation context.
- **Usage**: Nested within `UIProvider` to set up the translation context.
- **Purpose**: Ensures language preferences are set and available throughout the app.

### ThemeProvider

- **Role**: Manages theme preferences such as dark mode, colors, etc.
- **Usage**: Nested within `UIProviderWithLanguageReady` to provide theme-related preferences and actions.
- **Hook Used**: `useAppPreferencesSetup`
- **Purpose**: Handles the state and actions for dark mode, custom fonts, ripple effects, and more.

### ToastProvider

- **Role**: Provides context for displaying toast notifications.
- **Usage**: Nested within `ThemeProvider`.
- **Purpose**: Allows for customizable toast messages to inform users about various events.

### ConfirmProvider

- **Role**: Manages confirmation dialogs.
- **Usage**: Nested within `ToastProvider`.
- **Purpose**: Provides context for showing and handling user confirmations for various actions.

### CustomBottomSheetModal

- **Role**: Custom modal component for displaying bottom sheets.
- **Usage**: Nested within `ConfirmProvider`.
- **Purpose**: Provides a consistent modal experience across the app.
