import {
  AppTheme,
  ColorPicker,
  LabelSwitch,
  useTheme,
  useThemePreferences,
} from "@siteed/design-system"
import React, { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { colorOptions } from "../../_mocks/mock_data"
import { SegmentedButtons } from "react-native-paper"
import { useTranslation } from "react-i18next"

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      display: "flex",
      gap: 15,
      justifyContent: "center",
      alignItems: "center",
    },
  })
}

export interface ThemeConfigProps {
  flexDirection: "row" | "column";
}

const colors = colorOptions.map((colorOption) => colorOption.value)

export const ThemeConfig = ({ flexDirection }: ThemeConfigProps) => {
  const theme = useTheme()
  const styles = useMemo(() => getStyles(theme), [theme])
  const { toggleDarkMode, setThemeColor } = useThemePreferences()
  const { i18n } = useTranslation()

  return (
    <View style={[styles.container, { flexDirection }]}>
      <LabelSwitch
        label={"DarkMode"}
        value={theme.dark}
        onValueChange={toggleDarkMode}
      />
      <ColorPicker
        label={"Primary"}
        color={theme.colors.primary}
        colorOptions={colors}
        onChange={(newColor) => {
          console.log(newColor)
          setThemeColor({ name: "primary", value: newColor })
        }}
      />
      <ColorPicker
        label={"Secondary"}
        color={theme.colors.secondary}
        colorOptions={colors}
        onChange={(newColor) => {
          console.log(newColor)
          setThemeColor({ name: "secondary", value: newColor })
        }}
      />
      <ColorPicker
        label={"Tertiary"}
        color={theme.colors.tertiary}
        colorOptions={colors}
        onChange={(newColor) => {
          console.log(newColor)
          setThemeColor({ name: "tertiary", value: newColor })
        }}
      />
      <SegmentedButtons
        value={i18n.language}
        onValueChange={(newLocale) => {
          if (newLocale !== i18n.language) {
            console.log(`change language to ${newLocale}`, i18n)
            i18n.changeLanguage(newLocale)
          }
        }}
        buttons={[
          { label: "EN", value: "en" },
          { label: "FR", value: "fr" },
        ]}
      />
    </View>
  )
}
