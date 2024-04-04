import {
  DarkTheme,
  DefaultTheme,
  useTheme as useNavigationTheme,
} from "@react-navigation/native";
import {
  ScreenWrapper,
  useThemePreferences,
  ColorItem,
  LabelSwitch,
  ThemedView,
} from "@siteed/design-system";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
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

const IndexPage = () => {
  const { theme, darkMode, toggleDarkMode } = useThemePreferences();
  const navTheme = useNavigationTheme();
  const styles = useMemo(() => getStyles(), []);

  const colorEntries = Object.entries(navTheme.colors).filter(
    ([, value]) => typeof value === "string",
  );

  const navDarkColorEntries = Object.entries(DarkTheme.colors).filter(
    ([, value]) => typeof value === "string",
  );

  const navLightColorEntries = Object.entries(DefaultTheme.colors).filter(
    ([, value]) => typeof value === "string",
  );

  return (
    <ScreenWrapper>
      <LabelSwitch
        label="Dark Mode"
        onValueChange={toggleDarkMode}
        value={darkMode}
      />
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
        <ThemedView style={{ borderWidth: 1, padding: 5, width: "33%" }}>
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
        <ThemedView
          style={{
            borderWidth: 1,
            padding: 5,
            width: "33%",
            backgroundColor: DefaultTheme.colors.background,
          }}
        >
          <Text>Light Navigation Theme</Text>
          <Text>DarkMode: {DefaultTheme.dark ? "YES" : "NO"}</Text>
          {navLightColorEntries.map(([key, value]) => (
            // Only render ColorItem for string type colors
            <ColorItem
              key={key}
              color={value as string}
              label={`colors.${key}`}
            />
          ))}
        </ThemedView>
        <ThemedView
          style={{
            borderWidth: 1,
            padding: 5,
            width: "33%",
            backgroundColor: DarkTheme.colors.background,
          }}
        >
          <Text>Dark Navigation Theme</Text>
          <Text>DarkMode: {DarkTheme.dark ? "YES" : "NO"}</Text>
          {navDarkColorEntries.map(([key, value]) => (
            // Only render ColorItem for string type colors
            <ColorItem
              key={key}
              color={value as string}
              label={`colors.${key}`}
            />
          ))}
        </ThemedView>
      </ScrollView>
    </ScreenWrapper>
  );
};

export default IndexPage;
