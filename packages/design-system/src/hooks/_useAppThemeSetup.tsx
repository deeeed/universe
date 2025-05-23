// hooks/useAppTheme.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { MD3Theme, configureFonts } from 'react-native-paper';
import { useScreenWidth } from './useScreenWidth';

export interface CustomAppTheme extends Omit<MD3Theme, 'colors'> {
  dark: boolean;
  padding: {
    s: number;
    m: number;
    l: number;
  };
  margin: {
    s: number;
    m: number;
    l: number;
  };
  gap: {
    s: number;
    m: number;
    l: number;
  };
  colors: MD3Theme['colors'] & {
    card: string;
    text: string;
    border: string;
    notification: string;
    warning: string;
    warningContainer: string;
    success: string;
    successContainer: string;
    info: string;
    infoContainer: string;
    brand?: string;
  };
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export interface AppTheme extends CustomAppTheme {
  spacing: {
    margin: number;
    padding: number;
    gap: number;
  };
}

export interface SavedUserPreferences {
  darkMode?: boolean;
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
  savedPreferences?: SavedUserPreferences;
  customLightTheme: CustomAppTheme;
  customDarkTheme: CustomAppTheme;
}) => {
  const colorScheme = Appearance.getColorScheme();
  const [darkMode, setDarkMode] = useState<boolean>(
    savedPreferences?.darkMode ?? colorScheme === 'dark'
  );
  const [themeVersion, setThemeVersion] = useState<number>(3);
  const screenWidth = useScreenWidth();

  // Memoize spacing values and only recalculate when screen width crosses breakpoints
  const spacingValues = useMemo(() => {
    const baseTheme = darkMode ? customDarkTheme : customLightTheme;

    // Use the theme's actual breakpoints instead of hardcoded values
    if (screenWidth < baseTheme.breakpoints.mobile) {
      return {
        padding: baseTheme.padding.s,
        margin: baseTheme.margin.s,
        gap: baseTheme.gap.s,
      };
    } else if (screenWidth < baseTheme.breakpoints.tablet) {
      return {
        padding: baseTheme.padding.m,
        margin: baseTheme.margin.m,
        gap: baseTheme.gap.m,
      };
    } else {
      return {
        padding: baseTheme.padding.l,
        margin: baseTheme.margin.l,
        gap: baseTheme.gap.l,
      };
    }
  }, [
    screenWidth,
    darkMode,
    customDarkTheme.padding.s,
    customDarkTheme.padding.m,
    customDarkTheme.padding.l,
    customDarkTheme.margin.s,
    customDarkTheme.margin.m,
    customDarkTheme.margin.l,
    customDarkTheme.gap.s,
    customDarkTheme.gap.m,
    customDarkTheme.gap.l,
    customDarkTheme.breakpoints.mobile,
    customDarkTheme.breakpoints.tablet,
    customLightTheme.padding.s,
    customLightTheme.padding.m,
    customLightTheme.padding.l,
    customLightTheme.margin.s,
    customLightTheme.margin.m,
    customLightTheme.margin.l,
    customLightTheme.gap.s,
    customLightTheme.gap.m,
    customLightTheme.gap.l,
    customLightTheme.breakpoints.mobile,
    customLightTheme.breakpoints.tablet,
  ]);

  // Listen to system color scheme changes
  useEffect(() => {
    if (savedPreferences && savedPreferences.darkMode !== undefined) {
      setDarkMode(savedPreferences.darkMode);
      return; // No cleanup needed
    } else {
      const appearanceListener = ({
        colorScheme,
      }: {
        colorScheme: ColorSchemeName;
      }) => {
        setDarkMode(colorScheme === 'dark');
      };

      const subscription = Appearance.addChangeListener(appearanceListener);

      return () => {
        subscription.remove();
      };
    }
  }, [savedPreferences]);

  // Memoize setDarkMode callback to prevent unnecessary re-renders
  const stableSetDarkMode = useCallback(
    (value: boolean | ((oldValue: boolean) => boolean)) => {
      if (typeof value === 'function') {
        setDarkMode(value);
      } else {
        setDarkMode(value);
      }
    },
    []
  );

  // Memoize setThemeVersion callback
  const stableSetThemeVersion = useCallback((version: number) => {
    setThemeVersion(version);
  }, []);

  // Create stable theme object
  const theme = useMemo(() => {
    const baseTheme = darkMode ? customDarkTheme : customLightTheme;
    return {
      ...baseTheme,
      spacing: spacingValues,
    };
  }, [darkMode, customDarkTheme, customLightTheme, spacingValues]);

  // Create configured font theme
  const configuredFontTheme = useMemo(
    () => ({
      ...theme,
      fonts: fontFamily
        ? configureFonts({
            config: {
              fontFamily,
            },
          })
        : theme.fonts,
    }),
    [theme, fontFamily]
  );

  return {
    theme,
    configuredFontTheme,
    darkMode,
    locale: savedPreferences?.locale,
    setDarkMode: stableSetDarkMode,
    themeVersion,
    setThemeVersion: stableSetThemeVersion,
  };
};
