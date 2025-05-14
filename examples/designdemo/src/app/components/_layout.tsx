import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Stack, useRouter } from "expo-router";
import React from "react";

export default function TabLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerLeft: ({ tintColor }) => {
          return (
            <MaterialIcons
              name="arrow-back-ios"
              size={24}
              color={tintColor}
              onPress={() => router.back()}
              style={{ paddingRight: 10, paddingLeft: 10 }}
            />
          );
        },
      }}
    />
  );
}
