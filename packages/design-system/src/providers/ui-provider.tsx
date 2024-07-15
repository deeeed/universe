import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  ActivityIndicator,
  MD3Colors,
  MD3DarkTheme,
  MD3LightTheme,
} from 'react-native-paper';
import {
  SafeAreaProvider,
  SafeAreaProviderProps,
} from 'react-native-safe-area-context';
import {
  ThemeActions,
  ThemePreferences,
  useAppPreferencesSetup,
} from '../hooks/use-app-preferences-setup';
import { AppTheme, useAppThemeSetup } from '../hooks/use-app-theme-setup';
import { ConfirmProvider, ConfirmProviderProps } from './confirm-provider';
import { CustomBottomSheetModal } from './custom-bottomsheet-provider';
import { LanguageProvider } from './language-provider';
import { ThemeProvider } from './theme-provider';
import { ToastProvider, ToastProviderProps } from './toast.provider';

export const DefaultLightTheme: AppTheme = {
  ...MD3LightTheme,
  dark: false,
  padding: {
    s: 5,
    m: 10,
    l: 15,
  },
  margin: {
    s: 5,
    m: 10,
    l: 15,
  },
  colors: {
    ...MD3LightTheme.colors,
    ...DefaultTheme.colors,
    brand: MD3Colors.primary0,
    success: '#90EE90',
    successContainer: 'rgba(75,153,79,0.1)',
    warning: '#FFC300',
    warningContainer: 'rgba(255,193,7,0.1)',
    info: '#00BBFF',
    infoContainer: 'rgba(0,122,255,0.1)',
  },
};

export const DefaultDarkTheme: AppTheme = {
  ...MD3DarkTheme,
  dark: true,
  padding: {
    s: 5,
    m: 10,
    l: 15,
  },
  margin: {
    s: 5,
    m: 10,
    l: 15,
  },
  colors: {
    ...MD3DarkTheme.colors,
    ...DarkTheme.colors,
    brand: MD3Colors.primary0,
    success: 'rgba(75,153,79,0.9)',
    successContainer: 'rgba(75,153,79,0.1)',
    warning: 'rgba(255,193,7,0.9)',
    warningContainer: 'rgba(255,193,7,0.1)',
    info: 'rgba(0,122,255,0.9)',
    infoContainer: 'rgba(0,122,255,0.1)',
  },
};

export interface UIProviderProps {
  locale?: string;
  lightTheme?: AppTheme;
  darkTheme?: AppTheme;
  preferences?: Partial<Omit<ThemePreferences, 'theme'>>;
  actions?: ThemeActions;
  safeAreaProviderProps?: SafeAreaProviderProps;
  toastProviderProps?: ToastProviderProps;
  confirmProviderProps?: ConfirmProviderProps;
  children: React.ReactNode;
}

const UIProviderWithLanguageReady = ({
  preferences,
  actions,
  darkTheme,
  lightTheme,
  toastProviderProps,
  confirmProviderProps,
  children,
}: Omit<UIProviderProps, 'locale'>) => {
  // Create default preferences if none are provided
  const [activePreferences, setActivePreferences] = React.useState<
    ThemePreferences & ThemeActions
  >();
  const { i18n } = useTranslation();
  const {
    theme: defaultTheme,
    darkMode,
    setDarkMode,
    setThemeVersion,
  } = useAppThemeSetup({
    customDarkTheme: DefaultDarkTheme,
    customLightTheme: DefaultLightTheme,
  });

  // Calculate the theme based on preferences
  const theme = React.useMemo(() => {
    return darkMode
      ? { ...defaultTheme, ...darkTheme }
      : { ...defaultTheme, ...lightTheme };
  }, [darkMode, darkTheme, lightTheme, defaultTheme]);

  const defaultPreferences = useAppPreferencesSetup({
    theme: theme,
    setDarkMode,
    i18nInstance: i18n,
    setThemeVersion,
    savePreferences(_) {
      // Implement overwrites if needed
    },
  });

  useEffect(() => {
    let dynPrefs = { ...defaultPreferences };
    if (preferences) {
      dynPrefs = { ...dynPrefs, ...preferences };
    } else if (actions) {
      dynPrefs = { ...dynPrefs, ...actions };
    }
    setActivePreferences(dynPrefs);
  }, [preferences, actions]);

  if (!activePreferences) {
    return <ActivityIndicator />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider preferences={defaultPreferences}>
        <ToastProvider {...toastProviderProps}>
          <ConfirmProvider {...confirmProviderProps}>
            <CustomBottomSheetModal>{children}</CustomBottomSheetModal>
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

const UIProviderWithLanguage = (props: Omit<UIProviderProps, 'locale'>) => {
  const { i18n } = useTranslation();

  if (!i18n.isInitialized) {
    return <ActivityIndicator />;
  }

  return <UIProviderWithLanguageReady {...props} />;
};

export const UIProvider = ({
  locale,
  actions,
  safeAreaProviderProps,
  toastProviderProps,
  confirmProviderProps,
  preferences,
  darkTheme,
  lightTheme,
  children,
}: UIProviderProps) => {
  return (
    <SafeAreaProvider {...safeAreaProviderProps}>
      {/* Wrap with LanguageProvider to have useTranslation available */}
      <LanguageProvider locale={locale}>
        <UIProviderWithLanguage
          actions={actions}
          darkTheme={darkTheme}
          lightTheme={lightTheme}
          preferences={preferences}
          toastProviderProps={toastProviderProps}
          confirmProviderProps={confirmProviderProps}
        >
          {children}
        </UIProviderWithLanguage>
      </LanguageProvider>
    </SafeAreaProvider>
  );
};
