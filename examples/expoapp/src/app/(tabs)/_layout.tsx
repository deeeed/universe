import { Tabs, useNavigation } from "expo-router";
import React from "react";

export default function TabLayout() {
  const navigation = useNavigation();

  return (
    <Tabs
      initialRouteName="stream"
      screenOptions={
        {
          // headerLeft: () => (
          //   <MaterialIcons
          //     name="menu"
          //     size={24}
          //     style={{ paddingLeft: 10 }}
          //     color="black"
          //     onPress={() => {
          //       navigation.dispatch(DrawerActions.toggleDrawer());
          //     }}
          //   />
          // ),
        }
      }
    >
      <Tabs.Screen name="index" options={{}} />
      <Tabs.Screen name="second" options={{}} />
    </Tabs>
  );
}
