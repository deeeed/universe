import { useModal, useThemePreferences } from "@siteed/design-system/src";
import React from "react";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";

export interface Form2Props {
  label?: string;
}
export const Form2 = ({ label }: Form2Props) => {
  const { openDrawer, dismiss, dismissAll } = useModal();
  const { toggleDarkMode, darkMode } = useThemePreferences();

  const handlePress = () => {
    openDrawer({
      bottomSheetProps: {
        enableDynamicSizing: true,
        snapPoints: [],
      },
      render: () => <Form2 label={Date.now().toString()} />,
    });
  };

  const handleDismiss = async () => {
    try {
      await dismiss();
    } catch (error) {
      console.log(error);
    }
  };

  const handleDismissAll = () => {
    dismissAll();
  };

  return (
    <View style={{ backgroundColor: "blue", flex: 1 }}>
      <Text>Form2 {label}</Text>
      <Text>{darkMode ? "Dark Mode" : "Light Mode"}</Text>
      <Button onPress={handlePress}>Open</Button>
      <Button onPress={handleDismiss}>Close</Button>
      <Button onPress={handleDismissAll}>Dismiss All</Button>
      <Button onPress={toggleDarkMode}>Toggle Dark Mode</Button>
    </View>
  );
};
