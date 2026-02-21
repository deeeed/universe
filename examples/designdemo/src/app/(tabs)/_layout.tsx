import { useThemePreferences } from "@siteed/design-system";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
      <Tabs.Screen
        name="index"
        options={{
          title: "Theme",
          href: "/",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="palette" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="try"
        options={{
          href: "/try",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="test-tube" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="bottom-sheet"
        options={{
          title: "BottomSheet",
          href: "/bottom-sheet",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="layers" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
