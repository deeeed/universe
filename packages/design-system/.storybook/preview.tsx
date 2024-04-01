import type { Decorator, Preview } from "@storybook/react"
import { ConfirmProvider } from "@siteed/react-native-confirm"
import { LoggerProvider, useLoggerActions } from "@siteed/react-native-logger"
import { ToastProvider } from "@siteed/react-native-toaster"
import React, { useEffect } from "react"
import { Platform, View } from "react-native"
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler"
import {
  ActivityIndicator,
  MD3Colors,
  MD3DarkTheme,
  MD3LightTheme,
  Text
} from "react-native-paper"
import { Metrics, SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context"
import { ThemeConfig } from "../src/components/theme-config/theme-config"
import { useAppPreferencesSetup } from "../src/hooks/use-app-preferences-setup"
import { AppTheme, useAppThemeSetup } from "../src/hooks/use-app-theme-setup"
import { CustomBottomSheetModal } from "../src/providers/custom-bottomsheet-provider"
import { ThemeProvider } from "../src/providers/theme-provider"
import { LanguageProvider } from "../src/providers/language-provider"
import { useTranslation } from "react-i18next"
import { UIProvider } from "../src/providers/ui-provider"

// See https://callstack.github.io/react-native-paper/docs/guides/theming/#creating-dynamic-theme-colors
const customLightTheme: AppTheme = {
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

const customDarkTheme: AppTheme = {
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

/** @type { import('@storybook/react').Preview } */
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}
const PERSISTENCE_KEY = "APP_STATE"

const WithLogger = ({ children }: {children: React.ReactNode}) => {
  const { logger } = useLoggerActions("Preview")
  const {t, i18n} = useTranslation()
  const { theme, configuredFontTheme, setDarkMode, setThemeVersion } = useAppThemeSetup({ customDarkTheme, customLightTheme })
  const preferences = useAppPreferencesSetup({
    theme: theme,
    setDarkMode,
    i18nInstance: i18n,
    setThemeVersion,
    savePreferences(userPrefs) {
      console.log(`savePreferences: ${JSON.stringify(userPrefs)}`)
    },
  })

  useEffect(() => {
    logger.log(`primary: ${theme.colors.primary} secondary: ${theme.colors.secondary} tertiary: ${theme.colors.tertiary}`)
  }, [preferences])

  if (!preferences.theme) {
    return <ActivityIndicator />
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider preferences={preferences}>
        <React.Fragment>
          {Platform.OS === "web" ? (
            <style type="text/css">{`
                  @font-face {
                    font-family: 'MaterialCommunityIcons';
                    src: url(${require("react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf")}) format('truetype');
                  }
                `}
            </style>
          ) : null
          }
          <ConfirmProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <CustomBottomSheetModal>
                <ToastProvider>
                  <View style={{}}>
                    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                      <ThemeConfig flexDirection={"row"} />
                    </ScrollView>
                    <View style={{ flex: 1, padding: 8, backgroundColor: "#D3D3D3", minHeight: 300 }}>
                      {children}
                    </View>
                  </View>
                </ToastProvider>
              </CustomBottomSheetModal>
            </GestureHandlerRootView>
          </ConfirmProvider>
        </React.Fragment>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

export const decorators: Decorator[] = [
  // Using a decorator to apply padding for every story
  (StoryFn) => {
    console.log("preview init decorators")
    return (
      <LoggerProvider>
        <WithLogger>
          <LanguageProvider locale={"en"}>
            <StoryFn />
          </LanguageProvider>
        </WithLogger>
      </LoggerProvider>
    )
  },
]


export default preview
