// examples/designdemo/src/app/_layout.tsx
import { ThemeProvider, DefaultTheme } from "@react-navigation/native";
import { useThemePreferences } from "@siteed/design-system";
import { Stack } from "expo-router";
import { AgenticBridgeSync } from "../components/AgenticBridgeSync";

if (__DEV__) {
  require("../agentic-bridge");
}

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const { theme } = useThemePreferences();

  return (
    <ThemeProvider value={{ ...theme, fonts: DefaultTheme.fonts }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <AgenticBridgeSync />
    </ThemeProvider>
  );
}
