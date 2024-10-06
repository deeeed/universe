import "intl-pluralrules";
// Keep polyfills at the top

import { UIProvider } from "@siteed/design-system";
import { setLoggerConfig } from "@siteed/react-native-logger";
import { registerRootComponent } from "expo";
import { App as ExpoRouterApp } from "expo-router/build/qualified-entry";

setLoggerConfig({ namespaces: "*" });

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
    </UIProvider>
  );
};

registerRootComponent(AppEntry);
