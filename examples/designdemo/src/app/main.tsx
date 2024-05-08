import { Stack } from "expo-router";

const MainScreen = () => {
  return (
    <Stack initialRouteName="(tabs)">
      <Stack.Screen name="(tabs)" options={{ headerShown: true }} />
      <Stack.Screen
        name="second"
        options={{ headerShown: true, headerLeft: () => null }}
      />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
};

export default MainScreen;
