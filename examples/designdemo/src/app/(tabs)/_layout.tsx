import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { DrawerActions, ThemeProvider } from "@react-navigation/native";
import { UIProvider, useThemePreferences } from "@siteed/design-system";
import { Tabs, useNavigation } from "expo-router";
import React from "react";

const WithTheme = ({ children }: { children?: React.ReactNode }) => {
  const { theme } = useThemePreferences();

  return <ThemeProvider value={theme}>{children}</ThemeProvider>;
};

export default function TabLayout() {
  const navigation = useNavigation();

  return (
    <UIProvider>
      <WithTheme>
        <Tabs
          screenOptions={{
            headerShown: false,
            headerLeft: () => (
              <MaterialIcons
                name="menu"
                size={24}
                style={{ paddingLeft: 10 }}
                color="black"
                onPress={() => {
                  navigation.dispatch(DrawerActions.toggleDrawer());
                }}
              />
            ),
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Theme" }} />
          <Tabs.Screen name="try" options={{ href: "try" }} />
        </Tabs>
      </WithTheme>
    </UIProvider>
  );
}
