import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { DrawerActions } from "@react-navigation/native";
import { Tabs, useNavigation } from "expo-router";
import React from "react";

export default function TabLayout() {
  const navigation = useNavigation();

  return (
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
  );
}
