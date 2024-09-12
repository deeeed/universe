import { Button, useModal } from "@siteed/design-system";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Form2 } from "./form2";

const getStyles = () => {
  return StyleSheet.create({
    container: {},
  });
};

export interface Form1Props {
  label: string;
}
export const Form1 = ({ label }: Form1Props) => {
  const styles = useMemo(() => getStyles(), []);
  const { openDrawer, dismissAll } = useModal();

  const handlePress = () => {
    console.log("pressed");
    openDrawer({
      bottomSheetProps: {
        // stackBehavior: "replace",
      },
      render: () => <Form2 label="this is form 2" />,
    });
  };

  const handleDismiss = () => {
    dismissAll();
  };

  return (
    <View style={styles.container}>
      <Text>{label}</Text>
      <Button onPress={handlePress}>Call form2</Button>
      <Button onPress={handleDismiss}>Close</Button>
    </View>
  );
};
