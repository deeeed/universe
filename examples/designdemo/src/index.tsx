import "intl-pluralrules";
// Keep polyfills at the top

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SavedUserPreferences,
  UIProvider,
  useThemePreferences,
} from "@siteed/design-system";
import { setLoggerConfig } from "@siteed/react-native-logger";
import { registerRootComponent } from "expo";
import { App as ExpoRouterApp } from "expo-router/build/qualified-entry";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native-paper";

setLoggerConfig({ namespaces: "*" });

const DebugStatusBar = () => {
  const { darkMode, isReady: themeReady } = useThemePreferences();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setReady(true), 10);
    return () => clearTimeout(timeout);
  }, []);

  if (!ready || !themeReady) {
    return <ActivityIndicator />;
  }

  return <ExpoStatusBar style={darkMode ? "light" : "dark"} />;
};

const AppEntry = () => {
  const [initialPreferences, setInitialPreferences] = useState<
    SavedUserPreferences | undefined
  >();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPreferences() {
      try {
        const savedPreferences = await AsyncStorage.getItem("@app/preferences");
        console.log("DEBUG HERE savedPreferences", savedPreferences);
        if (savedPreferences) {
          setInitialPreferences(JSON.parse(savedPreferences));
        }
      } catch (error) {
        console.error("Failed to load preferences:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, []);

  if (isLoading) {
    return <ActivityIndicator />;
  }

  return (
    <UIProvider
      preferences={initialPreferences}
      actions={{
        savePreferences: async (preferences) => {
          try {
            await AsyncStorage.setItem(
              "@app/preferences",
              JSON.stringify(preferences),
            );
          } catch (error) {
            console.error("Failed to save preferences:", error);
          }
        },
      }}
      toastProviderProps={{
        isStackable: false,
        styleOverrides: {
          snackbarStyle: { marginBottom: 100 },
        },
      }}
    >
      <ExpoRouterApp />
      <DebugStatusBar />
    </UIProvider>
  );
};

registerRootComponent(AppEntry);
