import React, { FunctionComponent, ReactNode } from 'react';
import { PaperProvider } from 'react-native-paper';
import {
  ThemeActions,
  ThemePreferences,
} from '../hooks/_useAppPreferencesSetup';

interface ThemeProviderProps {
  children: ReactNode;
  preferences: ThemePreferences & ThemeActions;
}

export const PreferencesContext = React.createContext<
  ThemeProviderProps['preferences'] | null
>(null);

export const ThemeProvider: FunctionComponent<ThemeProviderProps> = ({
  children,
  preferences,
}) => {
  return (
    <PreferencesContext.Provider value={preferences}>
      <PaperProvider
        theme={preferences.theme}
        settings={{ rippleEffectEnabled: preferences.rippleEffectEnabled }}
      >
        {children}
      </PaperProvider>
    </PreferencesContext.Provider>
  );
};

export const useThemePreferences = () => {
  const context = React.useContext(PreferencesContext);
  if (!context) {
    throw new Error('useThemePreferences must be used within a ThemeProvider');
  }
  return context;
};

export const useTheme = () => {
  const context = React.useContext(PreferencesContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider ooo');
  }
  return context.theme;
};
