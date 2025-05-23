// packages/design-system/src/providers/UIProvider.tsx
import { PortalHost, PortalProvider } from '@gorhom/portal';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import React, { useMemo } from 'react';
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
  useAppPreferencesSetup,
} from '../hooks/_useAppPreferencesSetup';
import {
  AppTheme,
  CustomAppTheme,
  SavedUserPreferences,
  useAppThemeSetup,
} from '../hooks/_useAppThemeSetup';
import { ConfirmProvider, ConfirmProviderProps } from './ConfirmProvider';
import { LanguageProvider } from './LanguageProvider';
import { ModalControllerProvider } from './ModalControllerProvider';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider, ToastProviderProps } from './ToastProvider';
import { breakpoints as defaultBreakpoints } from '../constants/breakpoints';

export const DefaultLightTheme: CustomAppTheme = {
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
  gap: {
    s: 5,
    m: 8,
    l: 8,
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
  breakpoints: defaultBreakpoints,
};

export const DefaultDarkTheme: CustomAppTheme = {
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
  gap: {
    s: 5,
    m: 8,
    l: 8,
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
  breakpoints: defaultBreakpoints,
};

export interface UIProviderProps {
  locale?: string;
  lightTheme?: AppTheme;
  darkTheme?: AppTheme;
  portalName?: string;
  preferences?: SavedUserPreferences;
  actions?: Partial<ThemeActions>;
  safeAreaProviderProps?: SafeAreaProviderProps;
  toastProviderProps?: Partial<Omit<ToastProviderProps, 'children'>>;
  confirmProviderProps?: Partial<Omit<ConfirmProviderProps, 'children'>>;
  children: React.ReactNode;
  breakpoints?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

const UIProviderWithLanguageReady = ({
  preferences,
  actions,
  darkTheme,
  lightTheme,
  breakpoints = defaultBreakpoints,
  toastProviderProps,
  confirmProviderProps,
  portalName = 'modal',
  children,
}: Omit<UIProviderProps, 'locale'>) => {
  const { i18n } = useTranslation();

  const {
    theme: defaultTheme,
    darkMode,
    setDarkMode,
    setThemeVersion,
  } = useAppThemeSetup({
    customDarkTheme: DefaultDarkTheme,
    customLightTheme: DefaultLightTheme,
    savedPreferences: preferences,
  });

  // Memoize custom themes to prevent recreation
  const memoizedDarkTheme = useMemo(() => darkTheme, [darkTheme]);
  const memoizedLightTheme = useMemo(() => lightTheme, [lightTheme]);
  const memoizedBreakpoints = useMemo(() => breakpoints, [breakpoints]);

  // Memoize the final theme to prevent unnecessary recreations
  const theme = useMemo(() => {
    const baseTheme = darkMode
      ? { ...defaultTheme, ...memoizedDarkTheme }
      : { ...defaultTheme, ...memoizedLightTheme };

    return {
      ...baseTheme,
      breakpoints: {
        ...baseTheme.breakpoints,
        ...memoizedBreakpoints,
      },
    };
  }, [
    darkMode,
    defaultTheme,
    memoizedDarkTheme,
    memoizedLightTheme,
    memoizedBreakpoints,
  ]);

  // Memoize the save preferences action
  const memoizedSavePreferences = useMemo(
    () => actions?.savePreferences,
    [actions?.savePreferences]
  );

  // Memoize preferences setup to prevent recreation
  const defaultPreferences = useAppPreferencesSetup({
    theme,
    setDarkMode,
    i18nInstance: i18n,
    setThemeVersion,
    savePreferences: memoizedSavePreferences,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider preferences={defaultPreferences}>
        <ConfirmProvider {...confirmProviderProps}>
          <ToastProvider {...toastProviderProps}>
            <PortalProvider>
              <ModalControllerProvider>
                <>
                  {children}
                  <PortalHost name={portalName} />
                </>
              </ModalControllerProvider>
            </PortalProvider>
          </ToastProvider>
        </ConfirmProvider>
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
