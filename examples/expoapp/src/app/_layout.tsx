import { ThemeProvider } from "@react-navigation/native";
import {
  DefaultLightTheme,
  UIProvider,
  useThemePreferences,
} from "@siteed/design-system";
import { LoggerProvider, useLoggerActions } from "@siteed/react-native-logger";
import { Slot } from "expo-router";
import { useEffect } from "react";

const WithLogger = ({ children }: { children: React.ReactNode }) => {
  const { logger } = useLoggerActions("GoodApp");
  const { theme } = useThemePreferences();

  useEffect(() => {
    logger.info("App started", theme);
  }, [logger]);

  return <ThemeProvider value={{ ...theme }}>{children}</ThemeProvider>;
};

export default function HomeLayout() {
  return (
    <LoggerProvider>
      <UIProvider
        lightTheme={{
          ...DefaultLightTheme,
          // colors: { ...DefaultLightTheme.colors, background: "red" },
        }}
      >
        <WithLogger>
          <Slot />
        </WithLogger>
      </UIProvider>
    </LoggerProvider>
  );
}
