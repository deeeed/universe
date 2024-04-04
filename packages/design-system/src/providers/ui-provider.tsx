import { ConfirmProvider } from "@siteed/react-native-confirm"
import React, { useEffect } from "react"
import { useTranslation } from "react-i18next"
import {
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native"
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
  },
}

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
  },
}

export interface UIProviderProps {
  locale?: string;
  lightTheme?: AppTheme;
  darkTheme?: AppTheme;
  preferences?: Partial<Omit<ThemePreferences, "theme">>;
  actions?: ThemeActions;
  children: React.ReactNode;
}

const UIProviderWithLanguageReady = ({
  preferences,
  actions,
  darkTheme,
  lightTheme,
  children,
}: Omit<UIProviderProps, "locale">) => {
  // Create default preferences if none are provided
  const [activePreferences, setActivePreferences] = React.useState<ThemePreferences & ThemeActions>()
  const {i18n} = useTranslation()
  const { theme: defaultTheme, darkMode, setDarkMode, setThemeVersion } = useAppThemeSetup({ customDarkTheme: DefaultDarkTheme, customLightTheme: DefaultLightTheme })

  // Calculate the theme based on preferences
  const theme = React.useMemo(() => {
    return darkMode ? {...defaultTheme, ...darkTheme} : {...defaultTheme, ...lightTheme}
  }, [darkMode, darkTheme, lightTheme, defaultTheme])

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
    let dynPrefs = {...defaultPreferences }
    if (preferences) {
      dynPrefs = {...dynPrefs , ...preferences}
    } else if(actions) {
      dynPrefs = {...dynPrefs, ...actions}
    }
    setActivePreferences(dynPrefs)
  }, [preferences, actions])

  if(!activePreferences) {
    return <ActivityIndicator />
  }

  return (
    <ThemeProvider preferences={defaultPreferences}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ConfirmProvider>
          <CustomBottomSheetModal>{children}</CustomBottomSheetModal>
        </ConfirmProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  )
}

const UIProviderWithLanguage = (props:Omit<UIProviderProps, "locale">) => {
  const {i18n} = useTranslation()

  if(!i18n.isInitialized) {
    return <ActivityIndicator />
  }

  return (
    <UIProviderWithLanguageReady {...props} />
  )

}

export const UIProvider = ({
  locale,
  actions,
  preferences,
  darkTheme,
  lightTheme,
  children,
}: UIProviderProps) => {
  return (
    <SafeAreaProvider>
      {/* Wrap with LanguageProvider to have useTranslation available */}
      <LanguageProvider locale={locale}>
        <UIProviderWithLanguage actions={actions} darkTheme={darkTheme} lightTheme={lightTheme} preferences={preferences}>
          {children}
        </UIProviderWithLanguage>
      </LanguageProvider>
    </SafeAreaProvider>
  )
}
