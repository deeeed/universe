import React, { useMemo } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import { ColorItem } from "../../components/colors/color-item/color-item"
import { useTheme } from "../../providers/theme-provider"

const getStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1
    },
    scrollView: {
      width: "100%",
    },
  })
}

export interface ThemeViewerProps {  }
export const ThemeViewer = (_: ThemeViewerProps ) => {
  const { colors, dark } = useTheme()
  const styles = useMemo(() => getStyles(), [])
    
  // Filter out non-string color values (like the 'elevation' object)
  const colorEntries = Object.entries(colors).filter(([, value]) => typeof value === "string")

  return <View style={styles.container}>
    <Text>DarkMode: {dark ? "YES" : "NO"}</Text>
    <ColorItem color={colors.background} label={"colors.background"} />
    <ColorItem color={colors.backdrop} label={"colors.backdrop"} />
    <ScrollView style={styles.scrollView}>
      {colorEntries.map(([key, value]) => (
        // Only render ColorItem for string type colors
        <ColorItem key={key} color={value as string} label={`colors.${key}`} />
      ))}
    </ScrollView>

  </View>
}
