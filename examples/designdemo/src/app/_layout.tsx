// examples/designdemo/src/app/_layout.tsx
import { ThemeProvider } from "@react-navigation/native";
import { useThemePreferences } from "@siteed/design-system";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";

export const unstable_settings = {
  initialRouteName: "/",
};

export default function HomeLayout() {
  const { theme, darkMode } = useThemePreferences();
  return (
    <ThemeProvider value={{ ...theme }}>
      <StatusBar style={darkMode ? "light" : "dark"} />
      <Drawer screenOptions={{ headerShown: true }}>
        <Drawer.Screen name="(tabs)" />
      </Drawer>
    </ThemeProvider>
  );
}
