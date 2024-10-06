import "intl-pluralrules";
// Keep polyfills at the top

import { UIProvider } from "@siteed/design-system/src";
import { setLoggerConfig } from "@siteed/react-native-logger";
import { registerRootComponent } from "expo";
import { App as ExpoRouterApp } from "expo-router/build/qualified-entry";
// import "expo-router/entry";

setLoggerConfig({ namespaces: "*" });

const App = () => {
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

registerRootComponent(App);
