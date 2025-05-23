import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nextProviderProps } from 'react-i18next';
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
  savePreferences?: (preferences: SavedUserPreferences) => Promise<void> | void;
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
    dynamicTheme.dark,
    rippleEffectEnabled,
  ]);

  // Memoize all action functions with useCallback
  const toggleDarkMode = useCallback(() => {
    const newValue = !dynamicTheme.dark;
    setLocalDarkmode(newValue);
    setThemeDarkMode(newValue);
    savePreferences?.({
      darkMode: newValue,
      rippleEffectEnabled,
      locale: i18nInstance.language,
    });
  }, [
    dynamicTheme.dark,
    setThemeDarkMode,
    savePreferences,
    rippleEffectEnabled,
    i18nInstance.language,
  ]);

  const setDarkMode = useCallback(
    (value: boolean) => {
      setLocalDarkmode(value);
      setThemeDarkMode(value);
      savePreferences?.({
        darkMode: value,
        rippleEffectEnabled,
        locale: i18nInstance.language,
      });
    },
    [
      setThemeDarkMode,
      savePreferences,
      rippleEffectEnabled,
      i18nInstance.language,
    ]
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const toggleCustomFont = useCallback(() => {
    setCustomFont((prev) => !prev);
  }, []);

  const toggleRippleEffect = useCallback(() => {
    setRippleEffectEnabled((oldValue) => {
      const newValue = !oldValue;
      savePreferences?.({
        darkMode: dynamicTheme.dark,
        rippleEffectEnabled: newValue,
        locale: i18nInstance.language,
      });
      return newValue;
    });
  }, [savePreferences, dynamicTheme.dark, i18nInstance.language]);

  const setThemeColor = useCallback(
    ({ name, value }: { name: string; value: string }) => {
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
    []
  );

  const toggleThemeVersion = useCallback(() => {
    // Empty implementation - kept for API consistency
  }, []);

  // Memoize the final preferences object
  const preferences: ThemeActions & ThemePreferences = useMemo(
    () => ({
      toggleDarkMode,
      setDarkMode,
      toggleCollapsed,
      toggleCustomFont,
      toggleRippleEffect,
      setThemeColor,
      toggleThemeVersion,
      customFontLoaded,
      rippleEffectEnabled,
      collapsed,
      darkMode,
      theme: dynamicTheme,
      isReady,
    }),
    [
      toggleDarkMode,
      setDarkMode,
      toggleCollapsed,
      toggleCustomFont,
      toggleRippleEffect,
      setThemeColor,
      toggleThemeVersion,
      customFontLoaded,
      rippleEffectEnabled,
      collapsed,
      darkMode,
      dynamicTheme,
      isReady,
    ]
  );

  return preferences;
};
