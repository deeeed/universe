import { ConfirmProvider } from "@siteed/react-native-confirm"
import React, { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import {
  ActivityIndicator,
  MD3Colors,
  MD3DarkTheme,
  MD3LightTheme
} from "react-native-paper"
import { SafeAreaProvider } from "react-native-safe-area-context"
import {
  ThemeActions,
  ThemePreferences,
  useAppPreferencesSetup,
} from "../hooks/use-app-preferences-setup"
import { AppTheme, useAppThemeSetup } from "../hooks/use-app-theme-setup"
import { CustomBottomSheetModal } from "./custom-bottomsheet-provider"
import { LanguageProvider } from "./language-provider"
import { ThemeProvider } from "./theme-provider"

const defaultLightTheme: AppTheme = {
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
    primary: "tomato",
    secondary: "yellow",
    card: "#121212",
    border: "#121212",
    notification: "#121212",
    text: "#fff",
    brand: MD3Colors.primary0,
  },
}

const defaultDarkTheme: AppTheme = {
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
    primary: "tomato",
    secondary: "yellow",
    card: "#121212",
    border: "#121212",
    notification: "#121212",
    text: "#fff",
    brand: MD3Colors.primary0,
  },
}

export interface UIProviderProps {
  locale?: string;
  preferences?: ThemePreferences & ThemeActions;
  children: React.ReactNode;
}

const UIProviderWithLanguage = ({
  preferences,
  children,
}: UIProviderProps) => {
  // Create default preferences if none are provided
  const [activePreferences, setActivePreferences] = React.useState<ThemePreferences & ThemeActions>()
  const {i18n} = useTranslation()
  const { theme, setDarkMode, setThemeVersion } = useAppThemeSetup({ customDarkTheme: defaultDarkTheme, customLightTheme:defaultLightTheme })
  const defaultPreferences = useAppPreferencesSetup({
    theme: theme,
    setDarkMode,
    i18nInstance: i18n,
    setThemeVersion,
    savePreferences(_) {
      // Implement overwrites if needed
    },
  })

  useEffect(() => {
    if (preferences) {
      setActivePreferences(preferences)
    } else {
      setActivePreferences(defaultPreferences)
    }
  }, [preferences])

  if(!activePreferences) {
    return <ActivityIndicator />
  }

  return (
    <ThemeProvider preferences={preferences ? activePreferences : defaultPreferences}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ConfirmProvider>
          <CustomBottomSheetModal>{children}</CustomBottomSheetModal>
        </ConfirmProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  )
}

export const UIProvider = ({
  locale,
  preferences,
  children,
}: UIProviderProps) => {

  return (
    <SafeAreaProvider>
      {/* Wrap with LanguageProvider to have useTranslation available */}
      <LanguageProvider locale={locale}>
        <UIProviderWithLanguage preferences={preferences} locale={locale}>
          {children}
        </UIProviderWithLanguage>
      </LanguageProvider>
    </SafeAreaProvider>
  )
}
