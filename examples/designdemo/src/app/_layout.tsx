// examples/designdemo/src/app/_layout.tsx
import { ThemeProvider } from "@react-navigation/native";
import { useThemePreferences } from "@siteed/design-system";
import { Redirect } from "expo-router";
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
    <WithTheme>
      <Drawer screenOptions={{ headerShown: true }}>
        <Drawer.Screen name="(tabs)" />
      </Drawer>
    </WithTheme>
  );
}

// Add this to handle the root route
export function Root() {
  return <Redirect href="(tabs)" />;
}
