import {
  DarkTheme,
  DefaultTheme,
  useTheme as useNavigationTheme,
} from "@react-navigation/native";
import {
  ColorItem,
  ThemeConfig,
  ThemedView,
  useScreenWidth,
  useThemePreferences,
} from "@siteed/design-system";
import { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

const getStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      width: "100%",
      flex: 1,
    },
  });
};

const ThemePage = () => {
  const { theme } = useThemePreferences();
  const navTheme = useNavigationTheme();
  const styles = useMemo(() => getStyles(), []);
  const width = useScreenWidth();

  const colors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.tertiary,
  ];

  const colorEntries = Object.entries(navTheme.colors).filter(
    ([, value]) => typeof value === "string",
  );

  return (
    <ThemedView>
      <ThemeConfig colors={colors} />
      <Text>Width: {width}</Text>
      <Text>Default Theme Background: {DefaultTheme.colors.background}</Text>
      <Text>Dark Theme Background: {DarkTheme.colors.background}</Text>
      <Text>NavTheme background: {navTheme.colors.background}</Text>
      <Text>Theme Background: {theme.colors.background}</Text>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          alignContent: "space-around",
          flexDirection: "row",
        }}
      >
        <ThemedView style={{ borderWidth: 1, padding: 5 }}>
          <Text>Actual Theme</Text>
          <Text>DarkMode: {theme.dark ? "YES" : "NO"}</Text>
          {colorEntries.map(([key, value]) => (
            // Only render ColorItem for string type colors
            <ColorItem
              key={key}
              color={value as string}
              label={`colors.${key}`}
            />
          ))}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
};

export default ThemePage;
