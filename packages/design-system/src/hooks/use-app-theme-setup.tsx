// hooks/useAppTheme.ts
import { useEffect, useMemo, useState } from 'react';
import { MD3Theme, configureFonts } from 'react-native-paper';

export interface AppTheme extends Omit<MD3Theme, 'colors'> {
  // add fields for @react-navigation/native theme compatibility
  dark: boolean;
  padding: {
    // should adjust based on viewport
    s: number;
    m: number;
    l: number;
  };
  margin: {
    // should adjust based on viewport
    s: number;
    m: number;
    l: number;
  };
  colors: MD3Theme['colors'] & {
    card: string;
    text: string;
    border: string;
    notification: string;
    // notification related
    warning: string;
    warningContainer: string;
    success: string;
    successContainer: string;
    info: string;
    infoContainer: string;
    // custom fields
    brand?: string;
  };
}

export interface SavedUserPreferences {
  darkMode: boolean;
  locale?: string;
  rippleEffectEnabled: boolean;
}

export const useAppThemeSetup = ({
  fontFamily,
  savedPreferences,
  customDarkTheme,
  customLightTheme,
}: {
  fontFamily?: string;
  savedPreferences?: SavedUserPreferences; // if set will override the theme
  customLightTheme: AppTheme;
  customDarkTheme: AppTheme;
}) => {
  const [darkMode, setDarkMode] = useState(savedPreferences?.darkMode ?? false);
  const [themeVersion, setThemeVersion] = useState<number>(3);

  useEffect(() => {
    if (savedPreferences) {
      setDarkMode(savedPreferences.darkMode);
    }
  }, [savedPreferences]);

  const theme = useMemo(() => {
    return darkMode ? customDarkTheme : customLightTheme;
  }, [darkMode, customDarkTheme, customLightTheme]);

  const configuredFontTheme = {
    ...theme,
    fonts: fontFamily
      ? configureFonts({
          config: {
            fontFamily,
          },
        })
      : undefined,
  };

  return {
    theme,
    configuredFontTheme,
    darkMode,
    locale: savedPreferences?.locale,
    setDarkMode,
    themeVersion,
    setThemeVersion,
  };
};
