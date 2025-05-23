import React, { FunctionComponent, ReactNode, useMemo } from 'react';
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
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => preferences, [preferences]);

  // Memoize PaperProvider props
  const paperProviderTheme = useMemo(
    () => preferences.theme,
    [preferences.theme]
  );
  const paperProviderSettings = useMemo(
    () => ({ rippleEffectEnabled: preferences.rippleEffectEnabled }),
    [preferences.rippleEffectEnabled]
  );

  return (
    <PreferencesContext.Provider value={contextValue}>
      <PaperProvider
        theme={paperProviderTheme}
        settings={paperProviderSettings}
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
