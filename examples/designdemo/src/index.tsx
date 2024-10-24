import "intl-pluralrules";
// Keep polyfills at the top

import { UIProvider, useThemePreferences } from "@siteed/design-system";
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
  return (
    <UIProvider
      toastProviderProps={{
        overrides: {
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
