import { useLoggerActions } from "@siteed/react-native-logger"
import { useEffect, useMemo, useState } from "react"
import { I18nextProviderProps } from "react-i18next"
import { AppTheme, SavedUserPreferences } from "./use-app-theme-setup"

interface useThemePreferencesProps {
  theme: AppTheme;
  i18nInstance: I18nextProviderProps["i18n"];
  savedPreferences?: SavedUserPreferences;
  savePreferences?: (userPrefs: SavedUserPreferences) => void;
  setDarkMode: (value: boolean | ((oldValue: boolean) => boolean)) => void;
  setThemeVersion: (number: number) => void;
}

export interface ThemeActions {
  toggleShouldUseDeviceColors?: () => void;
  toggleDarkMode: () => void;
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
}

export const useAppPreferencesSetup = ({
  theme,
  i18nInstance,
  savePreferences,
  setDarkMode,
}: useThemePreferencesProps) => {
  const [collapsed, setCollapsed] = useState(false)
  const [customFontLoaded, setCustomFont] = useState(false)
  const [rippleEffectEnabled, setRippleEffectEnabled] = useState(true)
  const [dynamicTheme, setDynamicTheme] = useState<AppTheme>(theme)
  const { logger } = useLoggerActions("useAppPreferencesSetup")
  const [listener, setListener] = useState(false)

  useEffect(() => {
    setDynamicTheme(theme)
  }, [theme])

  useEffect(() => {
    const onLanguage = (lng: string) => {
      savePreferences?.({
        darkMode: dynamicTheme.dark,
        rippleEffectEnabled,
        locale: lng,
      })
    }

    if (!listener && i18nInstance.isInitialized) {
      i18nInstance.on("languageChanged", onLanguage)
      setListener(true)
    }

    return () => {}
  }, [
    i18nInstance,
    savePreferences,
    listener,
    logger,
    dynamicTheme,
    rippleEffectEnabled,
  ])

  const preferences: ThemeActions & ThemePreferences = useMemo(
    () => ({
      toggleDarkMode: () => {
        const oldValue = dynamicTheme.dark ?? false
        const newValue = !oldValue
        setDarkMode(newValue)
        savePreferences?.({
          darkMode: newValue,
          rippleEffectEnabled,
          locale: i18nInstance.language,
        })
      },
      toggleCollapsed: () => setCollapsed(!collapsed),
      toggleCustomFont: () => setCustomFont(!customFontLoaded),
      toggleRippleEffect: () => {
        setRippleEffectEnabled((oldValue) => {
          savePreferences?.({
            darkMode: dynamicTheme.dark,
            rippleEffectEnabled: !oldValue,
            locale: i18nInstance.language,
          })
          return !oldValue
        })
      },
      setThemeColor: ({ name, value }: { name: string; value: string }) => {
        setDynamicTheme((oldTheme) => {
          const newTheme = {
            ...oldTheme,
            colors: {
              ...oldTheme.colors,
              [name]: value,
            },
          }
          console.log(
            `[${name}] ${
              oldTheme.colors[name as keyof AppTheme["colors"]]
            } -> ${value}`
          )
          console.log(
            `primary: ${newTheme.colors.primary} secondary: ${newTheme.colors.secondary} tertiary: ${newTheme.colors.tertiary}`
          )
          return newTheme
        })
      },
      toggleThemeVersion: () => {},
      customFontLoaded,
      rippleEffectEnabled,
      collapsed,
      darkMode: dynamicTheme.dark,
      theme: dynamicTheme,
    }),
    [
      dynamicTheme,
      collapsed,
      i18nInstance,
      savePreferences,
      customFontLoaded,
      rippleEffectEnabled,
      setDarkMode,
    ]
  )

  return preferences
}
