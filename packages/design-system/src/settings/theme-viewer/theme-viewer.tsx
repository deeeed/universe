import React, { useMemo } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import { ColorItem } from "../../components/colors/color-item/color-item"
import { useTheme } from "../../providers/theme-provider"
import { DefaultDarkTheme, DefaultLightTheme } from "../../providers/ui-provider"

const getStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1
    },
    scrollView: {
      maxWidth: "100%",
    },
  })
}

export interface ThemeViewerProps {  }
export const ThemeViewer = (_: ThemeViewerProps ) => {
  const { colors, dark } = useTheme()
  const styles = useMemo(() => getStyles(), [])
    
  // Filter out non-string color values (like the 'elevation' object)
  const colorEntries = Object.entries(colors).filter(([, value]) => typeof value === "string")
  const darkThemeEntries = Object.entries(DefaultDarkTheme.colors).filter(([, value]) => typeof value === "string")
  const lightThemeEntries = Object.entries(DefaultLightTheme.colors).filter(([, value]) => typeof value === "string")

  return <View style={styles.container}>
    <Text>DarkMode: {dark ? "YES" : "NO"}</Text>
    <ColorItem color={colors.background} label={"colors.background"} />
    <ColorItem color={colors.backdrop} label={"colors.backdrop"} />
    <ScrollView style={styles.scrollView} contentContainerStyle={{flexDirection: "row"}}>
      <View style={{ borderWidth: 1, padding: 5, width: "30%" }}>
        <Text>Active Theme Colors</Text>
        {colorEntries.map(([key, value]) => (
        // Only render ColorItem for string type colors
          <ColorItem key={key} color={value as string} label={`colors.${key}`} />
        ))}
      </View>
      <View style={{ borderWidth: 1, padding: 5, width: "30%", backgroundColor: DefaultDarkTheme.colors.background }}>
        <Text style={{color: DefaultDarkTheme.colors.text}}>Dark Theme Colors</Text>
        {darkThemeEntries.map(([key, value]) => (
        // Only render ColorItem for string type colors
          <ColorItem key={key} color={value as string} labelStyle={{color:  DefaultDarkTheme.colors.text}} label={`colors.${key}`} />
        ))}
      </View>
      <View style={{ borderWidth: 1, padding: 5, width: "30%",  backgroundColor: DefaultLightTheme.colors.background }}>
        <Text style={{color: DefaultLightTheme.colors.text}}>Light Theme Colors</Text>
        {lightThemeEntries.map(([key, value]) => (
        // Only render ColorItem for string type colors
          <ColorItem key={key} color={value as string} labelStyle={{color:  DefaultLightTheme.colors.text}} label={`colors.${key}`} />
        ))}
      </View>
    </ScrollView>

  </View>
}
