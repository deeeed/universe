import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { DrawerActions } from "@react-navigation/native";
import { useThemePreferences } from "@siteed/design-system";
import { Tabs, useNavigation } from "expo-router";
import React from "react";

export default function TabLayout() {
  const navigation = useNavigation();
  const { darkMode, theme } = useThemePreferences();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerLeft: () => (
          <MaterialIcons
            name="menu"
            size={24}
            style={{ paddingLeft: 10 }}
            color={darkMode ? "white" : "black"}
            onPress={() => {
              navigation.dispatch(DrawerActions.toggleDrawer());
            }}
          />
        ),
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
