import { useThemePreferences } from "@siteed/design-system";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  const { theme } = useThemePreferences();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurface,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Theme", href: "/" }} />
      <Tabs.Screen name="try" options={{ href: "/try" }} />
      <Tabs.Screen name="bug" options={{ href: "/bug" }} />
      <Tabs.Screen name="modals" options={{ href: "/modals" }} />
    </Tabs>
  );
}
