import { useModal } from "@siteed/design-system/src";
import React from "react";
import { Text, View } from "react-native";
import { Button } from "react-native-paper";

export interface Form2Props {
  label?: string;
}
export const Form2 = ({ label }: Form2Props) => {
  const { openDrawer, dismiss } = useModal();

  const handlePress = () => {
    openDrawer({
      bottomSheetProps: {
        index: 0,
      },
      render: () => <Form2 label={Date.now().toString()} />,
    });
  };

  const handleDismiss = () => {
    dismiss();
  };

  return (
    <View>
      <Text>Form2 {label}</Text>
      <Button onPress={handlePress}>Open</Button>
      <Button onPress={handleDismiss}>Close</Button>
    </View>
  );
};
