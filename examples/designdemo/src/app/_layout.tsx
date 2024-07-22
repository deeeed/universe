import { ThemeProvider } from "@react-navigation/native";
import {
  DefaultLightTheme,
  UIProvider,
  useThemePreferences,
} from "@siteed/design-system";
import { getLogger } from "@siteed/react-native-logger";
import { Drawer } from "expo-router/drawer";
import { useEffect } from "react";

export const unstable_settings = {
  initialRouteName: "(tabs)", // always go back to the tabs screen
};

const logger = getLogger("WithMainProviders");
const WithMainProviders = () => {
  const { theme } = useThemePreferences();

  useEffect(() => {
    logger.info("App started", theme);
  }, [logger]);

  return (
    <ThemeProvider value={{ ...theme }}>
      <Drawer screenOptions={{ headerShown: true }}>
        <Drawer.Screen name="(tabs)" />
      </Drawer>
    </ThemeProvider>
  );
};

export default function HomeLayout() {
  return (
    <UIProvider
      lightTheme={{
        ...DefaultLightTheme,
        // colors: { ...DefaultLightTheme.colors, background: "red" }
      }}
      toastProviderProps={{
        overrides: {
          snackbarStyle: { marginBottom: 100 },
        },
      }}
    >
      <WithMainProviders />
    </UIProvider>
  );
}
