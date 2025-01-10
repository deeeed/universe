// hooks/useAppTheme.ts
import { useEffect, useMemo, useState } from 'react';
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

  // Define initial state for dynamic spacing
  const [dynamicSpacing, setDynamicSpacing] = useState({
    padding: customLightTheme.padding.m,
    margin: customLightTheme.margin.m,
    gap: customLightTheme.gap.m,
  });

  // Update dynamic spacing based on screen width
  useEffect(() => {
    if (screenWidth < 600) {
      setDynamicSpacing({
        padding: customLightTheme.padding.s,
        margin: customLightTheme.margin.s,
        gap: customLightTheme.gap.s,
      });
    } else if (screenWidth < 1024) {
      setDynamicSpacing({
        padding: customLightTheme.padding.m,
        margin: customLightTheme.margin.m,
        gap: customLightTheme.gap.m,
      });
    } else {
      setDynamicSpacing({
        padding: customLightTheme.padding.l,
        margin: customLightTheme.margin.l,
        gap: customLightTheme.gap.l,
      });
    }
  }, [
    screenWidth,
    customLightTheme.padding,
    customLightTheme.margin,
    customLightTheme.gap,
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

  const theme = useMemo(() => {
    const baseTheme = darkMode ? customDarkTheme : customLightTheme;
    return {
      ...baseTheme,
      spacing: dynamicSpacing,
    };
  }, [darkMode, customDarkTheme, customLightTheme, dynamicSpacing]);

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
