import { ThemeProvider } from "@react-navigation/native";
import { UIProvider, useThemePreferences } from "@siteed/design-system";
import { Drawer } from "expo-router/drawer";
import { useEffect } from "react";

export const unstable_settings = {
  initialRouteName: "(tabs)", // always go back to the tabs screen
};

const WithTheme = ({ children }: { children?: React.ReactNode }) => {
  const { theme, darkMode } = useThemePreferences();

  useEffect(() => {
    console.log(`WithTheme has mounted ${darkMode}`);
  }, [darkMode]);

  return <ThemeProvider value={{ ...theme }}>{children}</ThemeProvider>;
};

export default function HomeLayout() {
  return (
    <UIProvider
      toastProviderProps={{
        overrides: {
          snackbarStyle: { marginBottom: 100 },
        },
      }}
    >
      <WithTheme>
        <Drawer screenOptions={{ headerShown: true }}>
          <Drawer.Screen name="(tabs)" />
        </Drawer>
      </WithTheme>
    </UIProvider>
  );
}
