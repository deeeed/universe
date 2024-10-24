import { useEffect, useMemo, useState } from 'react';
import { I18nextProviderProps } from 'react-i18next';
import { baseLogger } from '../utils/logger';
import { AppTheme, SavedUserPreferences } from './_useAppThemeSetup';

interface useThemePreferencesProps {
  theme: AppTheme;
  i18nInstance: I18nextProviderProps['i18n'];
  savedPreferences?: SavedUserPreferences;
  savePreferences?: (userPrefs: SavedUserPreferences) => void;
  setDarkMode: (value: boolean | ((oldValue: boolean) => boolean)) => void;
  setThemeVersion: (number: number) => void;
}

export interface ThemeActions {
  toggleShouldUseDeviceColors?: () => void;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
  toggleThemeVersion: () => void;
  toggleCollapsed: () => void;
  toggleCustomFont: () => void;
  toggleRippleEffect: () => void;
  setThemeColor: (props: { name: string; value: string }) => void;
}

export interface ThemePreferences {
  customFontLoaded: boolean;
  rippleEffectEnabled: boolean;
  collapsed: boolean;
  theme: AppTheme;
  darkMode: boolean;
  shouldUseDeviceColors?: boolean;
  isReady: boolean;
}

const logger = baseLogger.extend('useAppPreferencesSetup');

export const useAppPreferencesSetup = ({
  theme,
  i18nInstance,
  savePreferences,
  setDarkMode: setThemeDarkMode,
}: useThemePreferencesProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setLocalDarkmode] = useState(theme.dark);
  const [customFontLoaded, setCustomFont] = useState(false);
  const [rippleEffectEnabled, setRippleEffectEnabled] = useState(true);
  const [dynamicTheme, setDynamicTheme] = useState<AppTheme>(theme);
  const [listener, setListener] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setDynamicTheme(theme);
  }, [theme]);

  // FIXNE: find a reliable way to determins when all providers are ready and set it from the parent UIProvider.
  // Currently, it causes issue with the status bar that is set too soon and somehow doesn't sync the theme.
  // useEffect(() => {
  //   const timeout = setTimeout(() => setIsReady(true), 1000);
  //   return () => clearTimeout(timeout);
  // }, []);

  useEffect(() => {
    const onLanguage = (lng: string) => {
      savePreferences?.({
        darkMode: dynamicTheme.dark,
        rippleEffectEnabled,
        locale: lng,
      });
    };

    if (!listener && i18nInstance.isInitialized) {
      i18nInstance.on('languageChanged', onLanguage);
      console.log('language changed set isReady to true');
      setListener(true);
      setIsReady(true);
    }

    return () => {};
  }, [
    i18nInstance,
    savePreferences,
    listener,
    logger,
    dynamicTheme,
    rippleEffectEnabled,
  ]);

  const preferences: ThemeActions & ThemePreferences = useMemo(
    () => ({
      toggleDarkMode: () => {
        const newValue = !dynamicTheme.dark;
        setLocalDarkmode(newValue);
        setThemeDarkMode(newValue);
        savePreferences?.({
          darkMode: newValue,
          rippleEffectEnabled,
          locale: i18nInstance.language,
        });
      },
      setDarkMode: (value: boolean) => {
        setLocalDarkmode(value);
        setThemeDarkMode(value);
        savePreferences?.({
          darkMode: value,
          rippleEffectEnabled,
          locale: i18nInstance.language,
        });
      },
      toggleCollapsed: () => setCollapsed(!collapsed),
      toggleCustomFont: () => setCustomFont(!customFontLoaded),
      toggleRippleEffect: () => {
        setRippleEffectEnabled((oldValue) => {
          savePreferences?.({
            darkMode: dynamicTheme.dark,
            rippleEffectEnabled: !oldValue,
            locale: i18nInstance.language,
          });
          return !oldValue;
        });
      },
      setThemeColor: ({ name, value }: { name: string; value: string }) => {
        setDynamicTheme((oldTheme) => {
          const newTheme = {
            ...oldTheme,
            colors: {
              ...oldTheme.colors,
              [name]: value,
            },
          };
          console.log(
            `[${name}] ${
              oldTheme.colors[name as keyof AppTheme['colors']]
            } -> ${value}`
          );
          console.log(
            `primary: ${newTheme.colors.primary} secondary: ${newTheme.colors.secondary} tertiary: ${newTheme.colors.tertiary}`
          );
          return newTheme;
        });
      },
      toggleThemeVersion: () => {},
      customFontLoaded,
      rippleEffectEnabled,
      collapsed,
      darkMode,
      theme: dynamicTheme,
      isReady,
    }),
    [
      dynamicTheme,
      isReady,
      collapsed,
      i18nInstance,
      savePreferences,
      customFontLoaded,
      rippleEffectEnabled,
      setThemeDarkMode,
    ]
  );

  return preferences;
};
