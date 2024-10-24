// examples/designdemo/src/app/_layout.tsx
import { ThemeProvider } from "@react-navigation/native";
import { useThemePreferences } from "@siteed/design-system";
import { Drawer } from "expo-router/drawer";
export const unstable_settings = {
  initialRouteName: "/",
};

export default function HomeLayout() {
  const { theme } = useThemePreferences();

  return (
    <ThemeProvider value={{ ...theme }}>
      <Drawer screenOptions={{ headerShown: true }}>
        <Drawer.Screen name="(tabs)" />
      </Drawer>
    </ThemeProvider>
  );
}
